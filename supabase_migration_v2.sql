-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users 表 (P0)
-- 假设 users 表已经存在，我们只添加/修改必要的列
-- 注意：Supabase 默认的 auth.users 表是受保护的，这里创建的是 public.users
-- 假设 public.users 存储了应用特定的用户数据，并与 auth.users 关联
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) DEFAULT auth.uid(),
    telegram_id text UNIQUE,
    telegram_username text UNIQUE,
    display_name text,
    avatar text,
    lucky_coins numeric DEFAULT 0 NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    vip_level integer DEFAULT 0 NOT NULL,
    invite_code text UNIQUE,
    invited_by text,
    is_active boolean DEFAULT TRUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone
);

-- 2. audit_logs 表 (P0, P1, P2)
-- 存储所有管理操作的日志
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id), -- 操作管理员ID
    action text NOT NULL, -- 操作类型，如 USER_DISABLE, DEPOSIT_APPROVED
    target_table text, -- 目标表名
    target_id text, -- 目标记录ID
    details jsonb, -- 详细信息，JSON格式
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. lotteries 表 (P0)
CREATE TABLE IF NOT EXISTS public.lotteries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    period integer UNIQUE NOT NULL,
    title text NOT NULL,
    description text,
    ticket_price numeric NOT NULL,
    total_tickets integer NOT NULL,
    sold_tickets integer DEFAULT 0 NOT NULL,
    max_per_user integer,
    status text NOT NULL DEFAULT 'UPCOMING', -- UPCOMING, ACTIVE, SOLD_OUT, DRAWING, COMPLETED, CANCELLED
    draw_time timestamp with time zone NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    product_id uuid, -- 关联商品ID
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. orders 表 (P1)
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number text UNIQUE NOT NULL,
    user_id uuid REFERENCES public.users(id) NOT NULL,
    type text NOT NULL, -- LOTTERY_PURCHASE, MARKET_PURCHASE, WALLET_RECHARGE
    total_amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, PROCESSING, COMPLETED, CANCELLED, REFUNDED, FAILED
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. deposit_requests 表 (P1)
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'SOM',
    payment_proof_url text,
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. withdrawal_requests 表 (P1)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'SOM',
    withdrawal_address text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED
    transaction_hash text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. shipping_records 表 (P1)
CREATE TABLE IF NOT EXISTS public.shipping_records (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES public.orders(id) NOT NULL,
    user_id uuid REFERENCES public.users(id) NOT NULL,
    tracking_number text,
    carrier text,
    shipping_address text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, SHIPPED, DELIVERED, FAILED
    shipped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. showoff_posts 表 (P2)
CREATE TABLE IF NOT EXISTS public.showoff_posts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    lottery_id uuid REFERENCES public.lotteries(id) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    image_urls text[], -- 存储图片URL数组
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. resale_items 表 (P2)
CREATE TABLE IF NOT EXISTS public.resale_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    lottery_id uuid REFERENCES public.lotteries(id) NOT NULL,
    resale_price numeric NOT NULL,
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, SOLD, CANCELLED
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. payment_config 表 (P2)
CREATE TABLE IF NOT EXISTS public.payment_config (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider text UNIQUE NOT NULL,
    config jsonb NOT NULL,
    is_active boolean DEFAULT TRUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 11. 存储过程/RPCs (P0)

-- RPC 1: 获取仪表板统计数据
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    total_users_count integer;
    active_lotteries_count integer;
    total_revenue_sum numeric;
    pending_orders_count integer;
BEGIN
    -- 总用户数
    SELECT COUNT(*) INTO total_users_count FROM public.users;

    -- 活跃夺宝数 (ACTIVE 或 SOLD_OUT)
    SELECT COUNT(*) INTO active_lotteries_count FROM public.lotteries WHERE status IN ('ACTIVE', 'SOLD_OUT');

    -- 总收入 (简化：所有已完成订单的总金额)
    SELECT COALESCE(SUM(total_amount), 0) INTO total_revenue_sum FROM public.orders WHERE status = 'COMPLETED';

    -- 待处理订单数 (PENDING)
    SELECT COUNT(*) INTO pending_orders_count FROM public.orders WHERE status = 'PENDING';

    RETURN jsonb_build_object(
        'total_users', total_users_count,
        'active_lotteries', active_lotteries_count,
        'total_revenue', total_revenue_sum,
        'pending_orders', pending_orders_count
    );
END;
$$;

-- RPC 2: 增加用户余额 (用于充值批准)
CREATE OR REPLACE FUNCTION public.increase_user_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users
    SET balance = balance + amount
    WHERE id = user_id;
END;
$$;

-- RPC 3: 减少用户余额 (用于提现批准)
CREATE OR REPLACE FUNCTION public.decrease_user_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users
    SET balance = balance - amount
    WHERE id = user_id;
    
    -- 检查余额是否足够，如果不足，可以抛出异常或回滚
    IF (SELECT balance FROM public.users WHERE id = user_id) < 0 THEN
        RAISE EXCEPTION 'Insufficient balance for user %', user_id;
    END IF;
END;
$$;

-- 12. 初始数据 (P2)
-- 插入一个测试用户（如果不存在）
INSERT INTO public.users (id, telegram_username, display_name, is_active)
VALUES (uuid_generate_v4(), 'test_admin_user', 'Test Admin', TRUE)
ON CONFLICT (telegram_username) DO NOTHING;

-- 插入一个支付配置（如果不存在）
INSERT INTO public.payment_config (provider, config, is_active)
VALUES ('USDT_TRC20', '{"address": "Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "min_deposit": 100}', TRUE)
ON CONFLICT (provider) DO NOTHING;

-- 插入一个测试夺宝（如果不存在）
INSERT INTO public.lotteries (period, title, ticket_price, total_tickets, draw_time, status)
VALUES (1, 'Test Lottery Item', 10.00, 100, now() + interval '7 days', 'ACTIVE')
ON CONFLICT (period) DO NOTHING;

-- 插入一个测试订单（如果不存在）
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    SELECT id INTO test_user_id FROM public.users WHERE telegram_username = 'test_admin_user' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        INSERT INTO public.orders (order_number, user_id, type, total_amount, status)
        VALUES ('ORD-TEST-001', test_user_id, 'LOTTERY_PURCHASE', 50.00, 'COMPLETED')
        ON CONFLICT (order_number) DO NOTHING;
    END IF;
END $$;
