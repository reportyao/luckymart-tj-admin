-- ============================================================
-- TezBarakat 地推管理系统 - P1 渠道分析迁移
-- 版本: 002
-- 日期: 2026-02-10
-- 描述: 创建邀请码管理表(managed_invite_codes)和渠道分析RPC函数
-- 依赖: 001_promoter_system.sql
-- ============================================================

-- ============================================================
-- 1. 邀请码管理表 (managed_invite_codes)
-- 用途: 将地推人员的邀请码与渠道/点位关联，实现渠道归因
-- 说明: code 字段对应 users.invite_code (或 referral_code)
-- ============================================================
CREATE TABLE IF NOT EXISTS managed_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,                                          -- 对应 users.invite_code
  promoter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 持有人
  channel TEXT NOT NULL DEFAULT 'offline_street',              -- 渠道标识
  point_id UUID REFERENCES promotion_points(id) ON DELETE SET NULL,  -- 关联点位
  is_active BOOLEAN NOT NULL DEFAULT true,                     -- 是否启用
  notes TEXT DEFAULT '',                                       -- 备注
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_managed_invite_codes_promoter ON managed_invite_codes(promoter_id);
CREATE INDEX IF NOT EXISTS idx_managed_invite_codes_channel ON managed_invite_codes(channel);
CREATE INDEX IF NOT EXISTS idx_managed_invite_codes_code ON managed_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_managed_invite_codes_active ON managed_invite_codes(is_active);

-- RLS
ALTER TABLE managed_invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on managed_invite_codes"
  ON managed_invite_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. RPC 函数: 获取渠道统计数据
-- 用途: 聚合各渠道的注册、充值数据，用于渠道效果分析
-- 参数:
--   p_range_start: 时间范围起始
--   p_range_end:   时间范围结束
--   p_prev_start:  上期起始 (用于环比)
--   p_prev_end:    上期结束
-- 返回: JSON 包含 channels 数组和 summary 对象
-- ============================================================
CREATE OR REPLACE FUNCTION get_channel_stats(
  p_range_start TIMESTAMPTZ DEFAULT date_trunc('month', now()),
  p_range_end TIMESTAMPTZ DEFAULT now(),
  p_prev_start TIMESTAMPTZ DEFAULT date_trunc('month', now() - INTERVAL '1 month'),
  p_prev_end TIMESTAMPTZ DEFAULT date_trunc('month', now())
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH channel_promoters AS (
    -- 获取每个渠道对应的地推人员ID列表
    SELECT
      mic.channel,
      mic.promoter_id
    FROM managed_invite_codes mic
    WHERE mic.is_active = true
      AND mic.channel IS NOT NULL
  ),
  -- 当前周期: 各渠道注册数
  channel_regs AS (
    SELECT
      cp.channel,
      COUNT(DISTINCT u.id) AS reg_count
    FROM users u
    JOIN channel_promoters cp ON u.referred_by_id = cp.promoter_id
    WHERE u.created_at >= p_range_start
      AND u.created_at < p_range_end
    GROUP BY cp.channel
  ),
  -- 当前周期: 各渠道充值数据
  channel_charges AS (
    SELECT
      cp.channel,
      COUNT(DISTINCT dr.user_id) AS charge_count,
      COALESCE(SUM(dr.amount), 0) AS charge_amount
    FROM deposit_requests dr
    JOIN users u ON u.id = dr.user_id
    JOIN channel_promoters cp ON u.referred_by_id = cp.promoter_id
    WHERE dr.status = 'APPROVED'
      AND dr.created_at >= p_range_start
      AND dr.created_at < p_range_end
    GROUP BY cp.channel
  ),
  -- 上期: 各渠道注册数
  prev_channel_regs AS (
    SELECT
      cp.channel,
      COUNT(DISTINCT u.id) AS reg_count
    FROM users u
    JOIN channel_promoters cp ON u.referred_by_id = cp.promoter_id
    WHERE u.created_at >= p_prev_start
      AND u.created_at < p_prev_end
    GROUP BY cp.channel
  ),
  -- 上期: 各渠道充值数据
  prev_channel_charges AS (
    SELECT
      cp.channel,
      COUNT(DISTINCT dr.user_id) AS charge_count,
      COALESCE(SUM(dr.amount), 0) AS charge_amount
    FROM deposit_requests dr
    JOIN users u ON u.id = dr.user_id
    JOIN channel_promoters cp ON u.referred_by_id = cp.promoter_id
    WHERE dr.status = 'APPROVED'
      AND dr.created_at >= p_prev_start
      AND dr.created_at < p_prev_end
    GROUP BY cp.channel
  ),
  -- 各渠道人员数
  channel_staff AS (
    SELECT
      cp.channel,
      COUNT(DISTINCT cp.promoter_id) AS staff_count
    FROM channel_promoters cp
    JOIN promoter_profiles pp ON pp.user_id = cp.promoter_id
    WHERE pp.promoter_status = 'active'
    GROUP BY cp.channel
  ),
  -- 汇总所有渠道
  all_channels AS (
    SELECT DISTINCT channel FROM channel_promoters
  )
  SELECT json_build_object(
    'channels', COALESCE((
      SELECT json_agg(row_data ORDER BY (row_data->>'registrations')::int DESC)
      FROM (
        SELECT json_build_object(
          'channel', ac.channel,
          'staff_count', COALESCE(cs.staff_count, 0),
          'registrations', COALESCE(cr.reg_count, 0),
          'charges', COALESCE(cc.charge_count, 0),
          'charge_amount', COALESCE(cc.charge_amount, 0),
          'conversion_rate', CASE
            WHEN COALESCE(cr.reg_count, 0) > 0
            THEN ROUND(COALESCE(cc.charge_count, 0)::numeric / cr.reg_count * 100, 1)
            ELSE 0
          END,
          'prev_registrations', COALESCE(pcr.reg_count, 0),
          'prev_charges', COALESCE(pcc.charge_count, 0),
          'prev_charge_amount', COALESCE(pcc.charge_amount, 0)
        ) AS row_data
        FROM all_channels ac
        LEFT JOIN channel_regs cr ON cr.channel = ac.channel
        LEFT JOIN channel_charges cc ON cc.channel = ac.channel
        LEFT JOIN prev_channel_regs pcr ON pcr.channel = ac.channel
        LEFT JOIN prev_channel_charges pcc ON pcc.channel = ac.channel
        LEFT JOIN channel_staff cs ON cs.channel = ac.channel
      ) sub
    ), '[]'::json),
    'summary', json_build_object(
      'total_registrations', COALESCE((SELECT SUM(reg_count) FROM channel_regs), 0),
      'total_charges', COALESCE((SELECT SUM(charge_count) FROM channel_charges), 0),
      'total_charge_amount', COALESCE((SELECT SUM(charge_amount) FROM channel_charges), 0),
      'prev_total_registrations', COALESCE((SELECT SUM(reg_count) FROM prev_channel_regs), 0),
      'prev_total_charges', COALESCE((SELECT SUM(charge_count) FROM prev_channel_charges), 0),
      'prev_total_charge_amount', COALESCE((SELECT SUM(charge_amount) FROM prev_channel_charges), 0),
      'total_channels', (SELECT COUNT(*) FROM all_channels),
      'total_staff', COALESCE((SELECT SUM(staff_count) FROM channel_staff), 0)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 完成
-- ============================================================
-- 执行说明:
-- 1. 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- 2. 确保 001_promoter_system.sql 已执行
-- 3. 确保 users 表包含 referred_by_id 和 invite_code 字段
-- 4. 确保 deposit_requests 表已存在
-- 5. 执行后在 Table Editor 中验证 managed_invite_codes 表创建成功
-- 6. 可通过 SELECT get_channel_stats() 测试 RPC 函数
