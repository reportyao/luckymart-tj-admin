# TezBarakat 地推管理系统增强方案

**版本**: 2.0 (最终版)
**日期**: 2026年02月10日
**适用仓库**: `luckymart-tj-admin` · `luckymart-tj-frontend` · `tezbarakat-promoter-toolkit`

---

## 目录

1. [方案背景与核心目标](#1-方案背景与核心目标)
2. [现有系统深度分析](#2-现有系统深度分析)
3. [数据库Schema扩展设计](#3-数据库schema扩展设计)
4. [P0 功能：MVP核心（第一阶段）](#4-p0-功能mvp核心第一阶段)
5. [P1 功能：效率提升（第二阶段）](#5-p1-功能效率提升第二阶段)
6. [P2 功能：深度运营（第三阶段）](#6-p2-功能深度运营第三阶段)
7. [前端路由与导航集成方案](#7-前端路由与导航集成方案)
8. [API接口定义](#8-api接口定义)
9. [实施路线图与工时估算](#9-实施路线图与工时估算)
10. [使用场景与决策框架](#10-使用场景与决策框架)

---

## 1. 方案背景与核心目标

### 1.1 方案定位

本方案基于对TezBarakat三个核心代码仓库的**逐文件深度分析**，以及对《杜尚别地推执行方案》和《管理后台产品方案》两份文档的全面理解，提出一套**可直接指导开发**的系统增强方案。

TezBarakat的商业模式核心在于：通过拼团（三人拼团，1/3价格参与，未中奖退积分）和积分商城（全额购买或一元夺宝）两大玩法，实现**资金沉淀**——用户充值的余额在拼团中2/3以积分形式沉淀在平台内，积分只能消费不能提现，形成资金飞轮效应。地推是这个飞轮的**启动引擎**，管理后台则是确保引擎高效运转的**仪表盘和控制台**。

### 1.2 核心目标

本方案围绕三个核心目标展开：

| 目标 | 具体描述 | 衡量标准 |
| :--- | :--- | :--- |
| **数据透明** | 消除地推运营中的信息黑盒，实现从"群里报数"到"后台实时看板"的跃迁 | 管理者可在30秒内获取任一地推人员的当日全部KPI |
| **效率提升** | 将重复性的数据汇报、报表生成、邀请码管理等工作自动化 | 运营总监每日数据整理时间从2小时降至0（自动化） |
| **决策驱动** | 为"增派/撤销点位"、"调整/淘汰人员"、"优化话术"等关键决策提供数据支撑 | 每个运营决策都有对应的数据依据 |

### 1.3 设计原则

> **MVP优先，够用就好，能快速迭代。** 不做"大而全"的企业级系统，做"丑但能用"的实战工具。

具体原则包括：

- **复用优先**：最大限度复用现有代码、组件、API和数据库结构，不引入新技术栈。
- **统一性**：所有新功能严格遵循现有项目的代码风格（React + TypeScript + Supabase + Tailwind CSS），保持一致性。
- **性价比**：每个功能都经过"实现难度 vs 业务影响"的评估，优先做"高影响、低难度"的功能。
- **渐进式**：按P0→P1→P2分阶段实施，每个阶段都能独立交付可用价值。

---

## 2. 现有系统深度分析

### 2.1 管理后台 (`luckymart-tj-admin`)

**技术栈**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase JS Client

**现有路由结构** (摘自 `App.tsx`)：

| 路由 | 页面组件 | 功能 |
| :--- | :--- | :--- |
| `/` | `DashboardPage` | 仪表盘首页 |
| `/users` | `UserListPage` | 用户列表 |
| `/user-management` | `UserManagementPage` | 用户管理 |
| `/referral-management` | `ReferralManagementPage` | 推荐关系树 |
| `/group-buy-products` | `GroupBuyProductManagementPage` | 拼团商品管理 |
| `/group-buy-sessions` | `GroupBuySessionManagementPage` | 拼团会话管理 |
| `/commission-config` | `CommissionConfigPage` | 三级佣金配置 |
| `/commission-records` | `CommissionRecordsPage` | 佣金记录查询 |
| `/deposit-review` | `DepositReviewPage` | 充值审核 |
| `/withdrawal-review` | `WithdrawalReviewPage` | 提现审核 |
| `/pickup-points` | `PickupPointsPage` | 自提点管理 |
| `/pickup-verification` | `PickupVerificationPage` | 自提核销 |
| `/algorithm-config` | `AlgorithmConfigPage` | 开奖算法配置 |
| `/draw-logs` | `DrawLogsPage` | 开奖日志 |
| `/admin-management` | `AdminManagementPage` | 管理员管理 (super_admin) |
| `/permission-management` | `PermissionManagementPage` | 权限管理 (super_admin) |
| `/error-logs` | `ErrorLogsPage` | 错误监控 |

**关键发现**：

1. **权限体系已就绪**：`ProtectedRoute` 组件支持 `requiredRole` 参数（`admin` / `super_admin`），新功能可直接复用此权限控制机制。
2. **侧边栏导航模式统一**：使用 `NavLink` 组件，新增菜单项只需在 `<nav>` 中添加一行代码。
3. **Supabase Context已封装**：通过 `useSupabase()` hook 获取客户端实例，所有数据操作风格一致。
4. **三级分销已实现**：`CommissionConfigPage` 管理三级佣金比例（level 1/2/3），`commission_settings` 表存储配置，`commissions` 表记录流水。这是地推激励体系的**天然基础**——地推人员就是一级邀请人，其下线的消费会产生佣金。

### 2.2 用户前端 (`luckymart-tj-frontend`)

**核心数据库结构** (摘自 `DATABASE_TABLES_LIST.md`，共70张表)：

与地推系统直接相关的表：

| 表名 | 说明 | 与地推的关系 |
| :--- | :--- | :--- |
| `profiles` | 用户资料（含 `referral_code`, `referrer_id`, `level`, `commission_rate`） | 每个用户都有唯一邀请码，地推人员通过邀请码追踪 |
| `wallets` | 用户钱包（TJS余额 + LUCKY_COIN积分） | 追踪充值和积分沉淀 |
| `deposits` / `deposit_requests` | 充值记录 | 追踪地推带来的首充 |
| `commissions` | 佣金流水 | 地推人员的佣金收入 |
| `commission_settings` | 三级佣金配置 | 地推激励规则 |
| `referrals` | 邀请关系 | 地推人员的下线网络 |
| `group_buy_orders` | 拼团订单 | 追踪用户参与拼团的行为 |
| `share_logs` | 分享日志 | 追踪分享裂变行为 |
| `invite_rewards` | 邀请奖励记录 | 邀请好友的积分奖励 |

**关键发现**：

1. **`profiles.referrer_id`** 是追踪邀请关系的核心字段——每个用户注册时记录其邀请人ID，形成树状结构。
2. **`profiles.referral_code`** 是每个用户的唯一邀请码——地推人员的邀请码就是其 `referral_code`。
3. **现有的 `referrals` 表**已经存储了邀请关系，可以直接用于地推数据聚合。
4. **钱包系统**区分了 `TJS`（余额）和 `LUCKY_COIN`（积分），与业务规则完全一致。
5. **已有37个RPC函数**，包括 `get_user_referral_stats`、`get_dashboard_stats`、`get_revenue_by_day` 等统计函数，可以直接复用或扩展。

### 2.3 推广工具包 (`tezbarakat-promoter-toolkit`)

**技术栈**: React + Vite (纯前端静态站)

**核心组件**：

| 组件 | 功能 | 可复用性 |
| :--- | :--- | :--- |
| `EarningsCalculator.jsx` | 佣金收入计算器（支持三级分销模拟） | 逻辑可直接迁移到用户端 |
| `Home.jsx` | 推广首页（话术、素材、FAQ） | 内容结构可复用 |
| `zh.js` / `ru.js` / `tg.js` | 多语言话术库 | 话术内容可迁移到数据库动态管理 |

**关键发现**：

1. 该工具包是**完全静态**的，与主系统无数据交互。
2. 收入计算器的算法（三级佣金 8%/3%/1%）与 `commission_settings` 表的配置一致，验证了系统的一致性。
3. 话术库包含塔吉克语、俄语、中文三种语言版本，内容质量高，值得迁移到后台动态管理。

### 2.4 核心结论

> 现有系统的**交易引擎**（拼团+积分商城+三级分销）已经成熟，**数据基础**（70张表+37个函数）非常扎实。缺失的是**运营管理层**——即如何利用这些已有的数据，为地推团队的精细化管理提供工具支持。好消息是，大部分所需数据已经在数据库中，我们需要做的主要是**聚合查询 + 展示界面**，开发成本可控。

---

## 3. 数据库Schema扩展设计

以下是需要新增的表和字段，设计原则是**最小化变更，最大化复用**。

### 3.1 新增表

```sql
-- ============================================================
-- 1. 地推点位表 (promotion_points)
-- 用途：管理地推的物理点位，追踪各点位的推广效果
-- ============================================================
CREATE TABLE IF NOT EXISTS promotion_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- 点位名称，如 "Dousti广场"、"塔吉克国立大学"
    city VARCHAR(50) DEFAULT '杜尚别',
    address TEXT,                          -- 详细地址
    area_size VARCHAR(20) DEFAULT 'medium', -- 'small', 'medium', 'large'
    latitude DECIMAL(10, 8),              -- 纬度（可选，用于未来热力图）
    longitude DECIMAL(11, 8),             -- 经度（可选）
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 2. 地推团队表 (promoter_teams)
-- 用途：管理地推团队分组（如"纳乌鲁兹突击队"、"日常A组"）
-- ============================================================
CREATE TABLE IF NOT EXISTS promoter_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- 团队名称
    leader_id UUID REFERENCES profiles(id), -- 队长
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 3. 地推人员档案表 (promoter_profiles)
-- 用途：为地推人员存储额外的管理信息
-- 说明：不修改现有 profiles 表，而是新建关联表，降低耦合
-- ============================================================
CREATE TABLE IF NOT EXISTS promoter_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id), -- 关联到 profiles 表
    team_id UUID REFERENCES promoter_teams(id),           -- 所属团队
    point_id UUID REFERENCES promotion_points(id),        -- 当前工作点位
    promoter_status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    hire_date DATE,                       -- 入职日期
    base_salary DECIMAL(10, 2),           -- 底薪 (TJS)
    phone VARCHAR(20),                    -- 联系电话
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 4. 邀请码管理表 (managed_invite_codes)
-- 用途：对地推人员的邀请码进行精细化管理和渠道追踪
-- 说明：复用 profiles.referral_code 作为实际邀请码，
--       本表用于记录邀请码的分配、渠道归属等管理信息
-- ============================================================
CREATE TABLE IF NOT EXISTS managed_invite_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) NOT NULL,            -- 对应 profiles.referral_code
    promoter_id UUID NOT NULL REFERENCES profiles(id), -- 持有人
    channel VARCHAR(50),                  -- 渠道标识：'offline_dousti', 'offline_university', 'online_instagram', 'online_telegram_ad', 'taxi_driver', 'barber_shop'
    point_id UUID REFERENCES promotion_points(id), -- 关联点位
    is_active BOOLEAN DEFAULT true,       -- 是否启用
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 5. 地推日志表 (promoter_daily_logs)
-- 用途：记录地推人员每日的手工上报数据（如接触人数）
-- 说明：系统自动统计的数据（注册数、充值数）不在此表，
--       此表仅存储无法自动获取的数据
-- ============================================================
CREATE TABLE IF NOT EXISTS promoter_daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promoter_id UUID NOT NULL REFERENCES profiles(id),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    contact_count INT DEFAULT 0,          -- 今日接触人数（地推员手工记录）
    point_id UUID REFERENCES promotion_points(id), -- 当日工作点位
    weather VARCHAR(20),                  -- 天气记录（可选）
    notes TEXT,                           -- 备注
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(promoter_id, log_date)         -- 每人每天只有一条记录
);

-- ============================================================
-- 6. 充值告警表 (deposit_alerts)
-- 用途：记录充值过程中的异常情况，供人工审核
-- ============================================================
CREATE TABLE IF NOT EXISTS deposit_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,      -- 'high_amount', 'frequent_deposit', 'suspicious_ip', 'instant_withdraw'
    user_id UUID NOT NULL REFERENCES profiles(id),
    deposit_id UUID REFERENCES deposits(id),
    amount DECIMAL(10, 2),
    details JSONB,                        -- 告警详情（IP、时间间隔等）
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'approved', 'rejected'
    reviewed_by UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 7. 话术管理表 (promotion_scripts)
-- 用途：后台动态管理推广话术，支持A/B测试
-- ============================================================
CREATE TABLE IF NOT EXISTS promotion_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_name VARCHAR(50) NOT NULL,    -- 版本名，如 "A-价格导向", "B-故事导向"
    content_zh TEXT,                      -- 中文版话术
    content_ru TEXT,                      -- 俄语版话术
    content_tg TEXT,                      -- 塔吉克语版话术
    target_scenario VARCHAR(50),          -- 适用场景：'university', 'market', 'mall', 'general'
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_user_id ON promoter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_team_id ON promoter_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_promoter_profiles_point_id ON promoter_profiles(point_id);
CREATE INDEX IF NOT EXISTS idx_managed_invite_codes_promoter_id ON managed_invite_codes(promoter_id);
CREATE INDEX IF NOT EXISTS idx_managed_invite_codes_channel ON managed_invite_codes(channel);
CREATE INDEX IF NOT EXISTS idx_promoter_daily_logs_date ON promoter_daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_promoter_daily_logs_promoter ON promoter_daily_logs(promoter_id);
CREATE INDEX IF NOT EXISTS idx_deposit_alerts_status ON deposit_alerts(status);
CREATE INDEX IF NOT EXISTS idx_deposit_alerts_user ON deposit_alerts(user_id);

-- ============================================================
-- 触发器：自动更新 updated_at
-- ============================================================
CREATE TRIGGER update_promotion_points_updated_at
    BEFORE UPDATE ON promotion_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promoter_teams_updated_at
    BEFORE UPDATE ON promoter_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promoter_profiles_updated_at
    BEFORE UPDATE ON promoter_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_managed_invite_codes_updated_at
    BEFORE UPDATE ON managed_invite_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promoter_daily_logs_updated_at
    BEFORE UPDATE ON promoter_daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 新增RPC函数

```sql
-- ============================================================
-- 函数1: get_promoter_dashboard_stats
-- 用途：一次性返回地推看板所需的所有聚合数据
-- 参数：时间范围 (today/week/month)
-- ============================================================
CREATE OR REPLACE FUNCTION get_promoter_dashboard_stats(
    p_time_range TEXT DEFAULT 'today'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- 计算起始时间
    CASE p_time_range
        WHEN 'today' THEN v_start_date := date_trunc('day', now());
        WHEN 'week' THEN v_start_date := date_trunc('week', now());
        WHEN 'month' THEN v_start_date := date_trunc('month', now());
        ELSE v_start_date := date_trunc('day', now());
    END CASE;

    -- 构建返回数据
    WITH promoter_list AS (
        -- 获取所有地推人员
        SELECT pp.user_id, p.first_name, p.last_name, p.referral_code,
               pp.team_id, pp.point_id, pt.name AS team_name, ppt.name AS point_name
        FROM promoter_profiles pp
        JOIN profiles p ON pp.user_id = p.id
        LEFT JOIN promoter_teams pt ON pp.team_id = pt.id
        LEFT JOIN promotion_points ppt ON pp.point_id = ppt.id
        WHERE pp.promoter_status = 'active'
    ),
    reg_stats AS (
        -- 统计每个地推人员带来的注册数
        SELECT p.referrer_id AS promoter_id, COUNT(*) AS registration_count
        FROM profiles p
        WHERE p.referrer_id IN (SELECT user_id FROM promoter_list)
          AND p.created_at >= v_start_date
        GROUP BY p.referrer_id
    ),
    charge_stats AS (
        -- 统计每个地推人员带来的首充用户数和金额
        -- 首充定义：用户的第一笔 APPROVED 充值
        SELECT
            ref.referrer_id AS promoter_id,
            COUNT(DISTINCT d.user_id) AS first_charge_count,
            COALESCE(SUM(d.amount), 0) AS first_charge_amount
        FROM deposits d
        JOIN profiles ref ON d.user_id = ref.id
        WHERE ref.referrer_id IN (SELECT user_id FROM promoter_list)
          AND d.status = 'APPROVED'
          AND d.created_at >= v_start_date
          -- 确保是该用户的首次充值
          AND NOT EXISTS (
              SELECT 1 FROM deposits d2
              WHERE d2.user_id = d.user_id
                AND d2.status = 'APPROVED'
                AND d2.created_at < v_start_date
          )
        GROUP BY ref.referrer_id
    ),
    contact_stats AS (
        -- 获取手工记录的接触人数
        SELECT promoter_id, SUM(contact_count) AS total_contacts
        FROM promoter_daily_logs
        WHERE log_date >= v_start_date::date
        GROUP BY promoter_id
    )
    SELECT jsonb_build_object(
        'summary', jsonb_build_object(
            'total_registrations', (SELECT COALESCE(SUM(registration_count), 0) FROM reg_stats),
            'total_first_charges', (SELECT COALESCE(SUM(first_charge_count), 0) FROM charge_stats),
            'total_first_charge_amount', (SELECT COALESCE(SUM(first_charge_amount), 0) FROM charge_stats),
            'total_contacts', (SELECT COALESCE(SUM(total_contacts), 0) FROM contact_stats)
        ),
        'promoters', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'user_id', pl.user_id,
                    'name', COALESCE(pl.first_name, '') || ' ' || COALESCE(pl.last_name, ''),
                    'referral_code', pl.referral_code,
                    'team_name', pl.team_name,
                    'point_name', pl.point_name,
                    'contacts', COALESCE(cs.total_contacts, 0),
                    'registrations', COALESCE(rs.registration_count, 0),
                    'first_charges', COALESCE(chs.first_charge_count, 0),
                    'first_charge_amount', COALESCE(chs.first_charge_amount, 0),
                    'reg_conversion_rate', CASE
                        WHEN COALESCE(cs.total_contacts, 0) > 0
                        THEN ROUND(COALESCE(rs.registration_count, 0)::numeric / cs.total_contacts * 100, 1)
                        ELSE 0 END,
                    'charge_conversion_rate', CASE
                        WHEN COALESCE(rs.registration_count, 0) > 0
                        THEN ROUND(COALESCE(chs.first_charge_count, 0)::numeric / rs.registration_count * 100, 1)
                        ELSE 0 END
                ) ORDER BY COALESCE(chs.first_charge_count, 0) DESC
            ), '[]'::jsonb)
            FROM promoter_list pl
            LEFT JOIN reg_stats rs ON pl.user_id = rs.promoter_id
            LEFT JOIN charge_stats chs ON pl.user_id = chs.promoter_id
            LEFT JOIN contact_stats cs ON pl.user_id = cs.promoter_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================
-- 函数2: get_point_stats
-- 用途：获取各地推点位的聚合统计数据
-- ============================================================
CREATE OR REPLACE FUNCTION get_point_stats(
    p_time_range TEXT DEFAULT 'today'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    CASE p_time_range
        WHEN 'today' THEN v_start_date := date_trunc('day', now());
        WHEN 'week' THEN v_start_date := date_trunc('week', now());
        WHEN 'month' THEN v_start_date := date_trunc('month', now());
        ELSE v_start_date := date_trunc('day', now());
    END CASE;

    WITH point_promoters AS (
        SELECT pp.point_id, pp.user_id
        FROM promoter_profiles pp
        WHERE pp.point_id IS NOT NULL AND pp.promoter_status = 'active'
    ),
    point_regs AS (
        SELECT ppr.point_id, COUNT(*) AS reg_count
        FROM profiles p
        JOIN point_promoters ppr ON p.referrer_id = ppr.user_id
        WHERE p.created_at >= v_start_date
        GROUP BY ppr.point_id
    ),
    point_charges AS (
        SELECT ppr.point_id,
               COUNT(DISTINCT d.user_id) AS charge_count,
               COALESCE(SUM(d.amount), 0) AS charge_amount
        FROM deposits d
        JOIN profiles ref ON d.user_id = ref.id
        JOIN point_promoters ppr ON ref.referrer_id = ppr.user_id
        WHERE d.status = 'APPROVED' AND d.created_at >= v_start_date
        GROUP BY ppr.point_id
    ),
    point_staff AS (
        SELECT point_id, COUNT(*) AS staff_count
        FROM promoter_profiles
        WHERE promoter_status = 'active' AND point_id IS NOT NULL
        GROUP BY point_id
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'point_id', pp.id,
            'point_name', pp.name,
            'area_size', pp.area_size,
            'staff_count', COALESCE(ps.staff_count, 0),
            'registrations', COALESCE(pr.reg_count, 0),
            'charges', COALESCE(pc.charge_count, 0),
            'charge_amount', COALESCE(pc.charge_amount, 0),
            'reg_per_staff', CASE
                WHEN COALESCE(ps.staff_count, 0) > 0
                THEN ROUND(COALESCE(pr.reg_count, 0)::numeric / ps.staff_count, 1)
                ELSE 0 END,
            'health', CASE
                WHEN COALESCE(pr.reg_count, 0) = 0 THEN 'inactive'
                WHEN COALESCE(pc.charge_count, 0)::numeric / NULLIF(pr.reg_count, 0) >= 0.25 THEN 'good'
                WHEN COALESCE(pc.charge_count, 0)::numeric / NULLIF(pr.reg_count, 0) >= 0.15 THEN 'fair'
                ELSE 'poor' END
        )
    ), '[]'::jsonb) INTO v_result
    FROM promotion_points pp
    LEFT JOIN point_regs pr ON pp.id = pr.point_id
    LEFT JOIN point_charges pc ON pp.id = pc.point_id
    LEFT JOIN point_staff ps ON pp.id = ps.point_id
    WHERE pp.status = 'active';

    RETURN v_result;
END;
$$;

-- ============================================================
-- 函数3: get_channel_stats
-- 用途：获取各渠道的推广效果统计
-- ============================================================
CREATE OR REPLACE FUNCTION get_channel_stats(
    p_time_range TEXT DEFAULT 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    CASE p_time_range
        WHEN 'today' THEN v_start_date := date_trunc('day', now());
        WHEN 'week' THEN v_start_date := date_trunc('week', now());
        WHEN 'month' THEN v_start_date := date_trunc('month', now());
        ELSE v_start_date := date_trunc('month', now());
    END CASE;

    WITH channel_codes AS (
        SELECT mic.channel, mic.promoter_id
        FROM managed_invite_codes mic
        WHERE mic.is_active = true AND mic.channel IS NOT NULL
    ),
    channel_regs AS (
        SELECT cc.channel, COUNT(*) AS reg_count
        FROM profiles p
        JOIN channel_codes cc ON p.referrer_id = cc.promoter_id
        WHERE p.created_at >= v_start_date
        GROUP BY cc.channel
    ),
    channel_charges AS (
        SELECT cc.channel,
               COUNT(DISTINCT d.user_id) AS charge_count,
               COALESCE(SUM(d.amount), 0) AS charge_amount
        FROM deposits d
        JOIN profiles ref ON d.user_id = ref.id
        JOIN channel_codes cc ON ref.referrer_id = cc.promoter_id
        WHERE d.status = 'APPROVED' AND d.created_at >= v_start_date
        GROUP BY cc.channel
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'channel', cr.channel,
            'registrations', cr.reg_count,
            'charges', COALESCE(cc.charge_count, 0),
            'charge_amount', COALESCE(cc.charge_amount, 0),
            'conversion_rate', CASE
                WHEN cr.reg_count > 0
                THEN ROUND(COALESCE(cc.charge_count, 0)::numeric / cr.reg_count * 100, 1)
                ELSE 0 END
        )
    ), '[]'::jsonb) INTO v_result
    FROM channel_regs cr
    LEFT JOIN channel_charges cc ON cr.channel = cc.channel;

    RETURN v_result;
END;
$$;
```

### 3.3 TypeScript类型定义扩展

以下类型需要添加到 `luckymart-tj-admin/src/types/database.types.ts` 中：

```typescript
// 在 Tables 对象中新增以下表定义

promotion_points: {
  Row: {
    id: string
    name: string
    city: string | null
    address: string | null
    area_size: string
    latitude: number | null
    longitude: number | null
    status: string
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    name: string
    city?: string | null
    address?: string | null
    area_size?: string
    latitude?: number | null
    longitude?: number | null
    status?: string
    notes?: string | null
  }
  Update: {
    name?: string
    city?: string | null
    address?: string | null
    area_size?: string
    status?: string
    notes?: string | null
  }
}

promoter_teams: {
  Row: {
    id: string
    name: string
    leader_id: string | null
    status: string
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    name: string
    leader_id?: string | null
    status?: string
    notes?: string | null
  }
  Update: {
    name?: string
    leader_id?: string | null
    status?: string
    notes?: string | null
  }
}

promoter_profiles: {
  Row: {
    id: string
    user_id: string
    team_id: string | null
    point_id: string | null
    promoter_status: string
    hire_date: string | null
    base_salary: number | null
    phone: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    team_id?: string | null
    point_id?: string | null
    promoter_status?: string
    hire_date?: string | null
    base_salary?: number | null
    phone?: string | null
    notes?: string | null
  }
  Update: {
    team_id?: string | null
    point_id?: string | null
    promoter_status?: string
    hire_date?: string | null
    base_salary?: number | null
    phone?: string | null
    notes?: string | null
  }
}

managed_invite_codes: {
  Row: {
    id: string
    code: string
    promoter_id: string
    channel: string | null
    point_id: string | null
    is_active: boolean
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    code: string
    promoter_id: string
    channel?: string | null
    point_id?: string | null
    is_active?: boolean
    notes?: string | null
  }
  Update: {
    channel?: string | null
    point_id?: string | null
    is_active?: boolean
    notes?: string | null
  }
}

promoter_daily_logs: {
  Row: {
    id: string
    promoter_id: string
    log_date: string
    contact_count: number
    point_id: string | null
    weather: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    promoter_id: string
    log_date?: string
    contact_count?: number
    point_id?: string | null
    weather?: string | null
    notes?: string | null
  }
  Update: {
    contact_count?: number
    point_id?: string | null
    weather?: string | null
    notes?: string | null
  }
}

deposit_alerts: {
  Row: {
    id: string
    alert_type: string
    user_id: string
    deposit_id: string | null
    amount: number | null
    details: Json | null
    severity: string
    status: string
    reviewed_by: string | null
    reviewed_at: string | null
    review_notes: string | null
    created_at: string
  }
  Insert: {
    id?: string
    alert_type: string
    user_id: string
    deposit_id?: string | null
    amount?: number | null
    details?: Json | null
    severity?: string
    status?: string
  }
  Update: {
    status?: string
    reviewed_by?: string | null
    reviewed_at?: string | null
    review_notes?: string | null
  }
}

promotion_scripts: {
  Row: {
    id: string
    version_name: string
    content_zh: string | null
    content_ru: string | null
    content_tg: string | null
    target_scenario: string | null
    is_active: boolean
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    version_name: string
    content_zh?: string | null
    content_ru?: string | null
    content_tg?: string | null
    target_scenario?: string | null
    is_active?: boolean
    notes?: string | null
  }
  Update: {
    version_name?: string
    content_zh?: string | null
    content_ru?: string | null
    content_tg?: string | null
    target_scenario?: string | null
    is_active?: boolean
    notes?: string | null
  }
}
```

---

## 4. P0 功能：MVP核心（第一阶段）

> **目标**: 5-6个工作日内完成，在地推启动前上线。
> **核心价值**: 从"信息黑盒"到"数据透明"。

### 4.1 地推作战指挥室 (PromoterDashboardPage)

**文件位置**: `src/pages/PromoterDashboardPage.tsx`

**功能描述**：

这是整个地推管理系统的**核心页面**，替代或增强现有的 `DashboardPage.tsx`。管理者打开此页面，30秒内即可掌握地推团队的全部关键数据。

**页面结构**：

```
┌─────────────────────────────────────────────────────────────┐
│  地推作战指挥室  📊    [今日] [本周] [本月]   🔄 自动刷新 60s  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 📱 注册数 │  │ 💰 首充数 │  │ 🎯 首充额 │  │ 👥 接触数 │   │
│  │   345    │  │    87    │  │ 12,500   │  │  1,200   │   │
│  │ ↑12% vs昨│  │ ↑8% vs昨 │  │ TJS      │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ━━━ 地推英雄榜 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  排名│姓名    │团队  │点位      │接触│注册│首充│金额(T)│拦截率│话术率│
│  ────┼────────┼──────┼─────────┼───┼───┼───┼──────┼─────┼─────│
│  🏆 │张三    │A组   │Dousti   │120│ 48│ 12│1,440 │ 40% │ 25% │
│  🥇 │李四    │A组   │大学     │ 95│ 35│  8│  960 │ 37% │ 23% │
│  🥈 │王五    │B组   │Mehrgon  │110│ 38│  9│1,080 │ 35% │ 24% │
│  🥉 │赵六    │B组   │Siyoma   │ 80│ 15│  2│  240 │ 19% │ 13% │
│  ⚠️ │吴九    │B组   │Siyoma   │ 60│ 12│  1│  120 │ 20% │  8% │
│                                                             │
│  ━━━ 点位概况 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  点位        │面积│人数│注册│充值│金额(T) │人均注册│健康度│建议     │
│  ────────────┼───┼───┼───┼───┼───────┼──────┼─────┼─────────│
│  Dousti广场  │ 大│  6│156│ 48│ 5,760 │ 26.0 │ 🟢  │保持投入  │
│  塔吉克大学  │ 中│  4│105│ 28│ 3,360 │ 26.3 │ 🟢  │保持投入  │
│  Mehrgon市场 │ 大│  4│ 81│ 16│ 1,920 │ 20.3 │ 🟡  │考虑增派  │
│  Siyoma Mall │ 小│  3│ 30│  5│   600 │ 10.0 │ 🔴  │考虑撤销  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**技术实现要点**：

1. **数据获取**: 调用 `supabase.rpc('get_promoter_dashboard_stats', { p_time_range: 'today' })` 和 `supabase.rpc('get_point_stats', { p_time_range: 'today' })`。
2. **自动刷新**: 使用 `useEffect` + `setInterval`，每60秒自动刷新数据。
3. **时间范围切换**: 提供"今日/本周/本月"三个按钮，切换时重新调用RPC函数。
4. **排序**: 英雄榜默认按首充数降序排列，支持点击列头切换排序字段。
5. **健康度标识**: 点位健康度由后端RPC函数计算，前端根据返回值渲染对应颜色标签。
6. **组件复用**: 使用与 `DashboardPage.tsx` 相同的卡片和表格样式，保持UI一致性。

**预估工时**: 后端RPC函数 4h + 前端页面 6h + 联调测试 2h = **12h**

### 4.2 邀请码与地推人员管理 (PromoterManagementPage)

**文件位置**: `src/pages/PromoterManagementPage.tsx`

**功能描述**：

统一管理地推人员的入职、分配、启用/停用，以及其邀请码与渠道/点位的绑定关系。

**页面结构**：

```
┌─────────────────────────────────────────────────────────────┐
│  地推人员管理  👥    [+ 添加地推员]  [批量导入]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  搜索: [________]  团队: [全部 ▼]  点位: [全部 ▼]  状态: [全部 ▼]│
│                                                             │
│  姓名    │邀请码  │团队│点位      │渠道    │状态  │操作        │
│  ────────┼───────┼───┼─────────┼───────┼─────┼────────────│
│  张三    │ZS2026 │A组│Dousti   │线下    │🟢活跃│[编辑][停用] │
│  李四    │LS2026 │A组│大学     │线下    │🟢活跃│[编辑][停用] │
│  出租车01│TC001  │—  │—        │出租车  │🟢活跃│[编辑][停用] │
│  理发店01│LF001  │—  │—        │理发店  │🟡待审│[审核][拒绝] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**核心操作**：

| 操作 | 说明 | 技术实现 |
| :--- | :--- | :--- |
| **添加地推员** | 从现有用户中选择（通过Telegram用户名或邀请码搜索），标记为地推人员，分配团队和点位 | INSERT into `promoter_profiles` + INSERT into `managed_invite_codes` |
| **编辑** | 修改地推员的团队、点位、渠道归属 | UPDATE `promoter_profiles` + UPDATE `managed_invite_codes` |
| **停用/启用** | 暂停或恢复地推员资格 | UPDATE `promoter_profiles.promoter_status` + UPDATE `managed_invite_codes.is_active` |
| **批量导入** | 上传CSV文件批量添加地推员（用于纳乌鲁兹节突击队快速入职） | 前端解析CSV，批量INSERT |

**与现有系统的集成**：

- 地推人员的邀请码直接使用其 `profiles.referral_code`，不需要额外生成。
- 通过 `managed_invite_codes` 表将邀请码与渠道/点位关联，实现渠道归因。
- 地推人员的佣金收入通过现有的三级分销体系自动计算，无需额外开发。

**预估工时**: 后端CRUD 3h + 前端页面 5h + 联调测试 2h = **10h**

### 4.3 KPI报表与自动推送 (ReportsPage + Telegram Bot)

**文件位置**: `src/pages/PromoterReportsPage.tsx` + Supabase Edge Function `send-daily-report`

**功能描述**：

自动生成日报/周报/月报，支持在后台查看和一键推送到Telegram群。

**日报内容模板** (Telegram消息格式)：

```
🔥 杜尚别地推日报 - 2026.03.15

━━━ 全队成绩 ━━━
📱 新增注册: 342 人（目标300，达成 ✅）
💰 新增充值: 92 人（目标80，达成 ✅）
🎯 日 GMV: 13,200 TJS（目标12,000，达成 ✅）
📊 注册→充值转化率: 26.9%

━━━ 点位排名 ━━━
🥇 Dousti广场: 注册156 | 充值48 | 5,760 TJS
🥈 塔吉克大学: 注册105 | 充值28 | 3,360 TJS
🥉 Mehrgon市场: 注册81 | 充值16 | 1,920 TJS

━━━ 个人TOP3 ━━━
🏆 张三: 注册48 | 充值15 | 1,800 TJS | 转化率31.3%
🥇 王五: 注册38 | 充值9 | 1,080 TJS | 转化率23.7%
🥈 李四: 注册35 | 充值8 | 960 TJS | 转化率22.9%

━━━ 今日之星 ━━━
🌟 张三 - 充值转化率31.3%（全队最高！）

━━━ 需关注 ━━━
⚠️ 吴九 - 注册12 | 充值1 | 转化率8.3%（连续3天低于15%）
⚠️ Siyoma Mall - 人均注册10.0（全队最低）
```

**技术实现**：

1. **后台查看**: `PromoterReportsPage.tsx` 页面，选择日期范围后调用 `get_promoter_dashboard_stats` 生成报表预览。
2. **自动推送**: 创建 Supabase Edge Function `send-daily-report`，内部逻辑为：
   - 调用 `get_promoter_dashboard_stats` 获取数据
   - 格式化为Markdown消息
   - 通过 `fetch('https://api.telegram.org/bot<TOKEN>/sendMessage', ...)` 发送到指定群组
3. **定时触发**: 在Supabase后台配置Cron Job: `0 22 * * *` (每天22:00触发)
4. **手动触发**: 后台页面提供"立即生成并推送"按钮，调用同一个Edge Function。

**预估工时**: 后端Edge Function 4h + 前端报表页面 4h + Telegram集成 2h = **10h**

### 4.4 充值告警与审核增强 (DepositAlertsPage)

**文件位置**: `src/pages/DepositAlertsPage.tsx`

**功能描述**：

在现有的 `DepositReviewPage` 基础上，增加自动化的异常检测和告警机制。

**告警规则**：

| 规则 | 触发条件 | 严重级别 | 处理方式 |
| :--- | :--- | :--- | :--- |
| 大额充值 | 单笔 > 500 TJS | medium | 标记待审核，人工确认 |
| 频繁充值 | 同一用户1小时内 > 3次 | high | 暂停到账，人工审核 |
| 充值后即提现 | 充值后30分钟内申请全额提现 | critical | 冻结操作，立即通知管理员 |
| 异常时段 | 凌晨2:00-6:00的大额充值 | low | 记录告警，次日审核 |

**技术实现**：

1. **告警生成**: 在现有的充值审核流程（`DepositReviewPage` 对应的后端逻辑）中，增加规则判断。当充值请求满足告警条件时，自动INSERT到 `deposit_alerts` 表。
2. **告警列表**: `DepositAlertsPage.tsx` 展示所有待审核的告警，支持按严重级别和类型筛选。
3. **审核操作**: 管理员可以"批准"或"拒绝"告警，并填写审核备注。

**预估工时**: 后端告警逻辑 3h + 前端告警页面 4h + 联调测试 1h = **8h**

---

## 5. P1 功能：效率提升（第二阶段）

> **目标**: 在P0上线后的2-3周内完成。
> **核心价值**: 赋能一线地推人员，自动化运营流程。

### 5.1 推广者中心 (用户端集成)

**文件位置**: `luckymart-tj-frontend` 中新建 `src/pages/PromoterCenterPage.tsx`

**功能描述**：

将 `tezbarakat-promoter-toolkit` 的核心功能整合到用户端Mini App中，为地推人员提供专属的移动工作台。只有被标记为地推人员（`promoter_profiles` 表中有记录且状态为active）的用户才能看到此入口。

**功能模块**：

| 模块 | 功能 | 数据来源 |
| :--- | :--- | :--- |
| **我的业绩** | 展示个人的今日/本周/本月注册数、首充数、佣金收入 | 扩展现有 `get-invite-data` Edge Function |
| **我的团队** | 展示一、二、三级下线列表及其贡献佣金 | 复用 `ReferralManagementPage` 的查询逻辑 |
| **推广物料** | 生成带个人邀请码的二维码海报，一键复制邀请链接 | 前端 `html-to-image` 库 + `profiles.referral_code` |
| **话术库** | 展示后台配置的推广话术（支持多语言） | 查询 `promotion_scripts` 表 |
| **今日打卡** | 记录今日接触人数（点击+1按钮） | INSERT/UPDATE `promoter_daily_logs` 表 |
| **排行榜** | 查看全队排名（激励竞争） | 调用 `get_promoter_dashboard_stats` 的promoters部分 |

**与现有代码的集成**：

- `InvitePage.tsx` 已经展示了邀请相关数据，推广者中心可以**复用其数据获取逻辑**，只是UI布局不同。
- 佣金计算器的算法直接从 `tezbarakat-promoter-toolkit/src/components/EarningsCalculator.jsx` 迁移，将其从JSX转为TSX并适配现有样式。
- 入口判断：在用户端的导航组件中，通过查询 `promoter_profiles` 表判断当前用户是否为地推人员，是则显示"推广中心"入口。

**预估工时**: 前端页面开发 12h + 后端扩展 4h + 物料生成功能 4h = **20h**

### 5.2 点位管理与分析 (PromotionPointsPage)

**文件位置**: `src/pages/PromotionPointsManagementPage.tsx`

**功能描述**：

管理地推点位的基本信息，并展示各点位的推广效果分析。

**页面结构**：

1. **点位列表**: 对 `promotion_points` 表的CRUD操作（添加/编辑/启用/停用点位）。
2. **点位分析**: 调用 `get_point_stats` RPC函数，以表格形式展示各点位的注册数、充值数、人均产出、健康度等指标。
3. **热力图** (可选升级): 使用 `react-leaflet` 在杜尚别地图上标注点位，用颜色深浅表示推广效果。MVP阶段可先用表格替代。

**预估工时**: 前端页面 6h + 后端RPC 2h (已在P0中完成) = **8h**

### 5.3 渠道效果分析 (ChannelAnalyticsPage)

**文件位置**: `src/pages/ChannelAnalyticsPage.tsx`

**功能描述**：

追踪和对比不同推广渠道（线下地推、出租车司机、理发店合作、Instagram、Telegram广告等）的推广效果和ROI。

**页面结构**：

```
┌─────────────────────────────────────────────────────────────┐
│  渠道效果分析  📊    [本周] [本月] [全部]                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  渠道          │注册数│充值数│充值额(TJS)│转化率│获客成本│ROI  │
│  ──────────────┼─────┼─────┼─────────┼─────┼──────┼─────│
│  线下-Dousti   │ 450 │ 120 │ 14,400  │26.7%│ 35   │ 3.2x│
│  线下-大学     │ 320 │  85 │ 10,200  │26.6%│ 38   │ 2.8x│
│  线下-Mehrgon  │ 280 │  55 │  6,600  │19.6%│ 45   │ 2.1x│
│  出租车司机    │  80 │  30 │  3,600  │37.5%│ 50   │ 2.4x│
│  理发店合作    │  45 │  12 │  1,440  │26.7%│ 33   │ 2.9x│
│  Instagram广告 │ 200 │  40 │  4,800  │20.0%│ 25   │ 3.8x│
│  Telegram广告  │ 150 │  35 │  4,200  │23.3%│ 20   │ 4.2x│
│                                                             │
│  💡 建议: Telegram广告ROI最高(4.2x)，建议增加投放预算        │
│  ⚠️ 注意: Mehrgon市场转化率持续偏低，建议优化话术或调整策略    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**技术实现**：

- 数据来源：调用 `get_channel_stats` RPC函数。
- 获客成本：需要在后台配置各渠道的投入成本（可在 `system_configs` 表中存储），前端计算 `成本/充值数`。
- ROI：`充值额 / 投入成本`。

**预估工时**: 前端页面 6h + 后端RPC 2h (已在Schema中定义) + 成本配置 2h = **10h**

---

## 6. P2 功能：深度运营（第三阶段）

> **目标**: 在业务稳定运行后持续迭代。
> **核心价值**: 精细化运营，提升用户LTV。

### 6.1 用户生命周期分层看板

**功能描述**：

对用户进行分层（注册未充值 / 首充未复购 / 活跃用户 / 高价值用户 / 流失风险用户），并支持对特定用户群体执行营销动作（如通过Telegram Bot推送消息）。

**用户分层定义**：

| 层级 | 定义 | 运营动作 |
| :--- | :--- | :--- |
| 注册未充值 | 注册超过3天但从未充值 | 推送"积分即将过期"提醒 |
| 首充未复购 | 完成首次充值但30天内无后续消费 | 推送中奖案例和新品通知 |
| 活跃用户 | 最近30天内有拼团或消费行为 | 推送邀请好友奖励 |
| 高价值用户 | 累计充值 > 500 TJS | 私聊维护，VIP专属活动 |
| 流失风险 | 曾经活跃但连续30天无登录 | 推送"回归礼包"积分奖励 |

**技术实现**：

- 后端创建 `get_user_lifecycle_stats` RPC函数，对用户进行分层统计。
- 前端展示各层级的用户数量和占比，支持点击查看详细用户列表。
- 集成Telegram Bot API，支持对选定用户群体批量发送消息。

**预估工时**: 20-30h

### 6.2 话术A/B测试框架

**功能描述**：

在后台管理不同版本的推广话术，将不同话术分配给不同地推人员，追踪各话术版本的转化率，数据驱动地优化话术。

**技术实现**：

- 利用已设计的 `promotion_scripts` 表存储话术版本。
- 在 `managed_invite_codes` 表中增加 `script_id` 字段，关联话术版本。
- 后端按话术版本聚合转化率数据。
- 前端展示各话术版本的对比数据。

**预估工时**: 15-20h

### 6.3 运营成本与ROI实时看板

**功能描述**：

将运营投入（地推工资、物料、广告费等）与产出（GMV、积分沉淀、用户LTV）进行实时对比，为"是否继续投入"的决策提供数据支撑。

**核心指标**：

| 指标 | 计算方式 | 意义 |
| :--- | :--- | :--- |
| 现金投入 | 后台手工录入各项成本 | 总投入 |
| 平台GMV | `SUM(deposits.amount)` where APPROVED | 总产出 |
| 积分沉淀额 | 拼团中未中奖用户退回的积分总额 | 资金飞轮核心指标 |
| 付费用户获客成本 (CAC) | 总投入 / 付费用户数 | 获客效率 |
| 用户生命周期价值 (LTV) | 用户平均累计充值额 | 用户价值 |
| ROI | (GMV - 商品成本) / 运营投入 | 投资回报率 |

**预估工时**: 15-20h

---

## 7. 前端路由与导航集成方案

### 7.1 新增路由 (在 `App.tsx` 中)

```tsx
// 在现有 Routes 中添加以下路由

// === 地推管理模块 ===
<Route path="/promoter-dashboard" element={<ProtectedRoute element={<PromoterDashboardPage />} requiredRole="admin" />} />
<Route path="/promoter-management" element={<ProtectedRoute element={<PromoterManagementPage />} requiredRole="admin" />} />
<Route path="/promotion-points" element={<ProtectedRoute element={<PromotionPointsManagementPage />} requiredRole="admin" />} />
<Route path="/promoter-reports" element={<ProtectedRoute element={<PromoterReportsPage />} requiredRole="admin" />} />
<Route path="/channel-analytics" element={<ProtectedRoute element={<ChannelAnalyticsPage />} requiredRole="admin" />} />
<Route path="/deposit-alerts" element={<ProtectedRoute element={<DepositAlertsPage />} requiredRole="admin" />} />
<Route path="/promotion-scripts" element={<ProtectedRoute element={<PromotionScriptsPage />} requiredRole="admin" />} />
```

### 7.2 侧边栏导航更新

在 `App.tsx` 的 `<nav>` 中，建议将地推相关功能组织在一个分组下：

```tsx
{/* 地推管理分组 */}
<div className="mt-4 mb-2 px-3">
  <span className="text-xs text-gray-500 uppercase tracking-wider">地推管理</span>
</div>
<NavLink to="/promoter-dashboard" label="地推看板" icon="📊" />
<NavLink to="/promoter-management" label="地推人员" icon="👥" />
<NavLink to="/promotion-points" label="地推点位" icon="📍" />
<NavLink to="/promoter-reports" label="KPI报表" icon="📈" />
<NavLink to="/channel-analytics" label="渠道分析" icon="📡" />
<NavLink to="/deposit-alerts" label="充值告警" icon="🚨" />
<NavLink to="/promotion-scripts" label="话术管理" icon="💬" />
```

### 7.3 新增页面组件清单

| 文件名 | 优先级 | 功能 |
| :--- | :--- | :--- |
| `src/pages/PromoterDashboardPage.tsx` | P0 | 地推作战指挥室 |
| `src/pages/PromoterManagementPage.tsx` | P0 | 地推人员管理 |
| `src/pages/PromoterReportsPage.tsx` | P0 | KPI报表生成与推送 |
| `src/pages/DepositAlertsPage.tsx` | P0 | 充值告警审核 |
| `src/pages/PromotionPointsManagementPage.tsx` | P1 | 地推点位管理与分析 |
| `src/pages/ChannelAnalyticsPage.tsx` | P1 | 渠道效果分析 |
| `src/pages/PromotionScriptsPage.tsx` | P2 | 话术管理与A/B测试 |

---

## 8. API接口定义

### 8.1 Supabase RPC函数

| 函数名 | 参数 | 返回值 | 用途 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| `get_promoter_dashboard_stats` | `p_time_range: 'today'/'week'/'month'` | JSONB (summary + promoters array) | 地推看板核心数据 | P0 |
| `get_point_stats` | `p_time_range` | JSONB (points array with health) | 点位分析数据 | P0 |
| `get_channel_stats` | `p_time_range` | JSONB (channels array with ROI) | 渠道分析数据 | P1 |
| `get_user_lifecycle_stats` | — | JSONB (层级分布) | 用户生命周期分析 | P2 |

### 8.2 Supabase Edge Functions

| 函数名 | 触发方式 | 功能 | 优先级 |
| :--- | :--- | :--- | :--- |
| `send-daily-report` | Cron Job (每日22:00) + 手动触发 | 生成日报并推送到Telegram | P0 |
| `check-deposit-alerts` | 充值审核流程中调用 | 检查充值是否触发告警规则 | P0 |
| `send-weekly-report` | Cron Job (每周一09:00) | 生成周报并推送到Telegram | P1 |

### 8.3 Supabase表操作 (直接通过Supabase Client)

以下操作通过前端直接调用 `supabase.from('table_name').select/insert/update/delete()` 实现，无需额外的Edge Function：

| 表名 | 操作 | 页面 |
| :--- | :--- | :--- |
| `promotion_points` | CRUD | PromotionPointsManagementPage |
| `promoter_teams` | CRUD | PromoterManagementPage |
| `promoter_profiles` | CRUD | PromoterManagementPage |
| `managed_invite_codes` | CRUD | PromoterManagementPage |
| `promoter_daily_logs` | INSERT/UPDATE | 用户端 PromoterCenterPage |
| `deposit_alerts` | SELECT/UPDATE | DepositAlertsPage |
| `promotion_scripts` | CRUD | PromotionScriptsPage |

---

## 9. 实施路线图与工时估算

### 9.1 总体时间线

| 阶段 | 周期 | 核心交付物 | 预估总工时 |
| :--- | :--- | :--- | :--- |
| **Phase 0 (P0)** | 5-6个工作日 | 地推看板 + 人员管理 + KPI报表 + 充值告警 | **40h** |
| **Phase 1 (P1)** | 2-3周 | 推广者中心(用户端) + 点位管理 + 渠道分析 | **38h** |
| **Phase 2 (P2)** | 持续迭代 | 用户分层 + 话术A/B测试 + ROI看板 | **50-70h** |

### 9.2 Phase 0 详细排期

| 天 | 任务 | 工时 | 产出 |
| :--- | :--- | :--- | :--- |
| Day 1 | 执行数据库Schema扩展SQL，创建新表和索引 | 2h | 7张新表 + 索引 + 触发器 |
| Day 1 | 开发 `get_promoter_dashboard_stats` RPC函数 | 4h | 核心统计函数 |
| Day 2 | 开发 `PromoterDashboardPage.tsx` 前端页面 | 6h | 地推看板页面 |
| Day 3 | 开发 `PromoterManagementPage.tsx` (含邀请码管理) | 8h | 人员管理页面 |
| Day 4 | 开发 `PromoterReportsPage.tsx` + `send-daily-report` Edge Function | 8h | 报表页面 + Telegram推送 |
| Day 5 | 开发 `DepositAlertsPage.tsx` + 告警规则逻辑 | 6h | 充值告警页面 |
| Day 5-6 | 更新 `App.tsx` 路由和导航 + 联调测试 + Bug修复 | 6h | 完整可用的P0版本 |

### 9.3 开发规范

为保证代码统一性和一致性，所有新开发的页面和组件必须遵循以下规范：

1. **文件命名**: 页面组件使用 `PascalCase` + `Page` 后缀，如 `PromoterDashboardPage.tsx`。
2. **数据获取**: 统一使用 `useSupabase()` hook 获取Supabase客户端，通过 `supabase.rpc()` 或 `supabase.from()` 获取数据。
3. **状态管理**: 使用React内置的 `useState` + `useEffect`，与现有页面保持一致，不引入额外状态管理库。
4. **UI组件**: 使用Tailwind CSS类名，复用现有页面中的卡片、表格、按钮样式。参考 `DashboardPage.tsx` 和 `CommissionConfigPage.tsx` 的UI模式。
5. **权限控制**: 所有新路由使用 `<ProtectedRoute element={...} requiredRole="admin" />`。
6. **错误处理**: 统一使用 `try/catch` + `console.error` + `alert` 或 `toast` 的模式，与现有代码一致。
7. **TypeScript**: 所有新组件使用TypeScript，接口定义放在组件文件顶部或 `src/types/` 目录下。

---

## 10. 使用场景与决策框架

### 10.1 场景一：每日运营决策

```
时间: 每天 20:00
工具: 地推作战指挥室 (PromoterDashboardPage)

步骤1: 打开看板，查看今日四大核心指标
  → 注册342人（目标300，达成✅）
  → 首充92人（目标80，达成✅）

步骤2: 查看英雄榜，识别异常
  → 吴九: 注册12人，充值1人，转化率8.3%
  → 连续3天低于15%，需要干预

步骤3: 查看点位概况
  → Siyoma Mall: 人均注册10.0，健康度🔴
  → 建议: 考虑撤销该点位或更换人员

步骤4: 做出决策
  → 决策A: 将吴九从Siyoma调到Dousti广场，配合张三学习话术
  → 决策B: 如果Siyoma连续一周🔴，撤销该点位
  → 在后台一键完成人员调配
```

### 10.2 场景二：纳乌鲁兹节突击管理

```
时间: 3月20日 (纳乌鲁兹节第一天)
工具: 地推人员管理 + 地推看板

步骤1: 批量导入15-20名突击队员
  → 上传CSV，一键创建promoter_profiles
  → 系统自动关联其referral_code到managed_invite_codes

步骤2: 分配点位
  → Dousti广场: 6-8人
  → 塔吉克大学: 3-4人
  → Mehrgon市场: 3-4人
  → Siyoma Mall: 2-3人

步骤3: 实时监控（每小时查看一次看板）
  → 如果某点位注册数远超预期 → 立即从低产出点位调人增援
  → 如果某人连续2小时0注册 → 检查是否在岗

步骤4: 晚间自动日报推送到Telegram群
  → 全队看到成绩，激发第二天的竞争动力
```

### 10.3 场景三：渠道投放决策

```
时间: 4月中旬
工具: 渠道效果分析 (ChannelAnalyticsPage)

步骤1: 查看各渠道本月数据
  → 线下地推: 注册1200人，充值320人，转化率26.7%，CAC=45 TJS
  → Telegram广告: 注册500人，充值120人，转化率24.0%，CAC=20 TJS
  → Instagram: 注册300人，充值60人，转化率20.0%，CAC=25 TJS

步骤2: 对比ROI
  → Telegram广告ROI最高(4.2x)，且CAC最低
  → 线下地推ROI次之(2.8x)，但绝对量最大

步骤3: 做出决策
  → 增加Telegram广告预算至8,000 TJS/月
  → 线下地推保持现有规模，不再扩张
  → Instagram重点做内容运营（免费），减少付费投放
```

### 10.4 每日三问决策框架

管理者每天看完数据后，问自己三个问题：

> **问题一**: 今天的注册→充值转化率，和过去3天的平均值相比，是高还是低？
> - 如果高 → 分析原因（哪个人/点位/话术贡献最大？能复制吗？）
> - 如果低 → 排查原因（天气？话术疲劳？点位饱和？）
>
> **问题二**: 地推人员之间的表现差距有多大？
> - 如果差距 > 3倍 → 分析是能力问题还是分配问题，决定"调整分配"还是"淘汰换人"
>
> **问题三**: 哪个点位/渠道的人均产出最高？
> - 高产出渠道 → 考虑增加投入
> - 低产出渠道 → 考虑优化或撤销

---

## 附录A：与现有三级分销体系的深度融合

TezBarakat现有的三级分销体系（`commission_settings` 表，Level 1/2/3）是地推激励的**天然基础**。地推人员作为一级邀请人，其下线用户的每笔消费都会产生佣金收入。

**融合要点**：

1. **地推人员 = 一级邀请人**: 地推人员通过自己的 `referral_code` 邀请用户注册，自动成为该用户的一级上线。
2. **佣金自动计算**: 现有的佣金计算逻辑（`trigger_commission_for_exchange` 等函数）已经实现了三级分销的自动计算，地推人员无需额外操作即可获得佣金。
3. **佣金作为激励**: 地推人员的收入 = 底薪 + 注册提成 + 三级分销佣金。其中三级分销佣金是**长期收入**，即使地推人员不再主动推广，其下线的持续消费仍会产生佣金。这是一个强大的激励机制。
4. **管理后台的佣金查看**: 现有的 `CommissionRecordsPage` 已经可以查看佣金流水，地推管理者可以直接使用此功能监控地推人员的佣金收入情况。

**不需要额外开发的功能**：

- 佣金计算逻辑（已有）
- 佣金记录查看（已有 `CommissionRecordsPage`）
- 佣金配置管理（已有 `CommissionConfigPage`）
- 推荐关系树查看（已有 `ReferralManagementPage`）

**需要增强的功能**：

- 在 `PromoterDashboardPage` 中增加佣金相关统计（如"本月团队总佣金"、"人均佣金"）
- 在用户端推广者中心展示个人佣金收入趋势

## 附录B：与拼团和积分商城业务的联动

**拼团业务联动**：

- 地推人员在现场引导用户参与拼团（120 TJS拼智能手表），这是**首充转化的核心话术**。
- 管理后台应能追踪"地推带来的用户中，有多少参与了拼团"，这可以通过关联 `group_buy_orders.user_id` 和 `profiles.referrer_id` 实现。
- 建议在P1阶段的看板中增加"地推用户拼团参与率"指标。

**积分商城联动**：

- 拼团未中奖用户获得的积分，会在积分商城中消费，形成**二次变现**。
- 地推人员应了解积分商城的商品结构，以便在现场引导用户："即使没中奖，积分也可以在商城兑换商品。"
- 建议在推广者中心的话术库中，增加积分商城相关的话术模板。

**资金沉淀追踪**：

- 这是平台的核心商业指标。建议在P2阶段的ROI看板中，增加"积分沉淀额"指标：
  - 计算公式：`SUM(拼团订单中未中奖用户的支付金额)` = 沉淀在平台内的资金
  - 这个指标直接反映了"地推带来的用户为平台沉淀了多少资金"

## 附录C：不建议实现的功能

| 功能 | 不做的原因 |
| :--- | :--- |
| 员工GPS定位追踪 | 侵犯隐私，降低积极性。用邀请码数据说话即可。 |
| 高级预测模型 | MVP阶段数据量不足（2-3个月），做回归分析没有意义。 |
| 客户CRM系统 | 地推场景不需要"追踪客户"，核心是拦截和注册。 |
| 自动化风控系统 | 太复杂，容易误杀合法用户。MVP阶段靠人工审核。 |
| 独立的地推员App | 开发成本高。直接在Telegram Mini App中增加推广者中心即可。 |

---

> **本方案的核心理念**: 用最少的代码量，解决地推运营中最关键的信息不对称问题。后台是工具，地推执行才是王道。先做"丑但能用"的MVP，基于实际数据快速迭代。
