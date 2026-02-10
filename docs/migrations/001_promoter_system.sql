-- ============================================================
-- TezBarakat 地推管理系统 - 数据库迁移
-- 版本: 001
-- 日期: 2026-02-10
-- 描述: 创建地推管理所需的全部表和RPC函数
-- ============================================================

-- ============================================================
-- 1. 地推团队表
-- ============================================================
CREATE TABLE IF NOT EXISTS promoter_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_promoter_teams_leader ON promoter_teams(leader_user_id);

-- RLS
ALTER TABLE promoter_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on promoter_teams"
  ON promoter_teams FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. 推广点位表
-- ============================================================
CREATE TABLE IF NOT EXISTS promotion_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  area_size TEXT NOT NULL DEFAULT 'medium' CHECK (area_size IN ('large', 'medium', 'small')),
  point_status TEXT NOT NULL DEFAULT 'active' CHECK (point_status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE promotion_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on promotion_points"
  ON promotion_points FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. 地推人员档案表
-- ============================================================
CREATE TABLE IF NOT EXISTS promoter_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES promoter_teams(id) ON DELETE SET NULL,
  point_id UUID REFERENCES promotion_points(id) ON DELETE SET NULL,
  promoter_status TEXT NOT NULL DEFAULT 'active' CHECK (promoter_status IN ('active', 'paused', 'dismissed')),
  hire_date DATE,
  daily_base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_team ON promoter_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_point ON promoter_profiles(point_id);
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_status ON promoter_profiles(promoter_status);

-- RLS
ALTER TABLE promoter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on promoter_profiles"
  ON promoter_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. 地推每日工作日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS promoter_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contact_count INTEGER NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promoter_id, log_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_promoter_daily_logs_date ON promoter_daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_promoter_daily_logs_promoter ON promoter_daily_logs(promoter_id);

-- RLS
ALTER TABLE promoter_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on promoter_daily_logs"
  ON promoter_daily_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. RPC 函数: 获取地推指挥室概览数据
-- ============================================================
CREATE OR REPLACE FUNCTION get_promoter_dashboard_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH promoter_ids AS (
    SELECT user_id FROM promoter_profiles WHERE promoter_status = 'active'
  ),
  registrations AS (
    SELECT
      COUNT(*) AS total_regs,
      COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) AS today_regs
    FROM users
    WHERE referred_by_id IN (SELECT user_id FROM promoter_ids)
      AND created_at::date BETWEEN p_start_date AND p_end_date
  ),
  deposits AS (
    SELECT
      COUNT(DISTINCT dr.user_id) AS charged_users,
      COALESCE(SUM(dr.amount), 0) AS total_deposit_amount,
      COUNT(CASE WHEN dr.created_at::date = CURRENT_DATE THEN 1 END) AS today_deposits
    FROM deposit_requests dr
    JOIN users u ON u.id = dr.user_id
    WHERE u.referred_by_id IN (SELECT user_id FROM promoter_ids)
      AND dr.status = 'APPROVED'
      AND dr.created_at::date BETWEEN p_start_date AND p_end_date
  ),
  pending AS (
    SELECT COUNT(*) AS pending_count
    FROM deposit_requests
    WHERE status = 'PENDING'
  )
  SELECT json_build_object(
    'active_promoters', (SELECT COUNT(*) FROM promoter_ids),
    'total_registrations', COALESCE(r.total_regs, 0),
    'today_registrations', COALESCE(r.today_regs, 0),
    'charged_users', COALESCE(d.charged_users, 0),
    'total_deposit_amount', COALESCE(d.total_deposit_amount, 0),
    'today_deposits', COALESCE(d.today_deposits, 0),
    'pending_deposits', COALESCE(p.pending_count, 0)
  ) INTO result
  FROM registrations r, deposits d, pending p;

  RETURN result;
END;
$$;

-- ============================================================
-- 6. RPC 函数: 获取地推人员排行榜
-- ============================================================
CREATE OR REPLACE FUNCTION get_promoter_leaderboard(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_data) INTO result
  FROM (
    SELECT
      pp.user_id,
      COALESCE(u.telegram_username, CONCAT(u.first_name, ' ', u.last_name)) AS name,
      pt.name AS team_name,
      COUNT(DISTINCT ref.id) AS registrations,
      COUNT(DISTINCT CASE WHEN dr.id IS NOT NULL THEN ref.id END) AS charges,
      COALESCE(SUM(dr.amount), 0) AS charge_amount
    FROM promoter_profiles pp
    JOIN users u ON u.id = pp.user_id
    LEFT JOIN promoter_teams pt ON pt.id = pp.team_id
    LEFT JOIN users ref ON ref.referred_by_id = pp.user_id
      AND ref.created_at::date BETWEEN p_start_date AND p_end_date
    LEFT JOIN deposit_requests dr ON dr.user_id = ref.id
      AND dr.status = 'APPROVED'
      AND dr.created_at::date BETWEEN p_start_date AND p_end_date
    WHERE pp.promoter_status = 'active'
    GROUP BY pp.user_id, u.telegram_username, u.first_name, u.last_name, pt.name
    ORDER BY registrations DESC
    LIMIT p_limit
  ) AS row_data;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ============================================================
-- 7. RPC 函数: 获取每日注册趋势
-- ============================================================
CREATE OR REPLACE FUNCTION get_promoter_daily_trend(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_data ORDER BY day) INTO result
  FROM (
    SELECT
      d.day::date AS day,
      COUNT(DISTINCT u.id) AS registrations,
      COUNT(DISTINCT CASE WHEN dr.id IS NOT NULL THEN u.id END) AS charges
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(day)
    LEFT JOIN users u ON u.created_at::date = d.day::date
      AND u.referred_by_id IN (
        SELECT user_id FROM promoter_profiles WHERE promoter_status = 'active'
      )
    LEFT JOIN deposit_requests dr ON dr.user_id = u.id
      AND dr.status = 'APPROVED'
      AND dr.created_at::date = d.day::date
    GROUP BY d.day
  ) AS row_data;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ============================================================
-- 完成
-- ============================================================
-- 执行说明:
-- 1. 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- 2. 确保 users 表已存在且包含 referred_by_id 字段
-- 3. 确保 deposit_requests 表已存在
-- 4. 执行后在 Table Editor 中验证表是否创建成功
