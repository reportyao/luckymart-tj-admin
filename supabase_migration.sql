-- Migration: 20251117_admin_backend_setup

-- 1. 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建表结构

-- users 表 (P0)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id text UNIQUE NOT NULL,
    telegram_username text UNIQUE,
    display_name text,
    avatar text,
    lucky_coins numeric DEFAULT 0 NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    vip_level integer DEFAULT 0 NOT NULL,
    invite_code text UNIQUE,
    invited_by uuid REFERENCES public.users(id),
    is_active boolean DEFAULT TRUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone
);

-- lotteries 表 (P0)
CREATE TABLE IF NOT EXISTS public.lotteries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    period integer UNIQUE NOT NULL,
    title text NOT NULL,
    description text,
    product_id uuid, -- 假设有一个 products 表，这里简化为直接关联
    ticket_price numeric NOT NULL,
    total_tickets integer NOT NULL,
    max_per_user integer,
    currency text DEFAULT 'Som' NOT NULL,
    status text DEFAULT 'UPCOMING' NOT NULL, -- UPCOMING, ACTIVE, SOLD_OUT, DRAWING, COMPLETED, CANCELLED
    sold_tickets integer DEFAULT 0 NOT NULL,
    winning_numbers text[],
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    draw_time timestamp with time zone NOT NULL,
    actual_draw_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- orders 表 (P0)
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    order_number text UNIQUE NOT NULL,
    type text NOT NULL, -- LOTTERY_PURCHASE, MARKET_PURCHASE, WALLET_RECHARGE
    total_amount numeric NOT NULL,
    currency text DEFAULT 'Som' NOT NULL,
    payment_method text, -- BALANCE_WALLET, LUCKY_COIN_WALLET, EXTERNAL_PAYMENT
    lottery_id uuid REFERENCES public.lotteries(id),
    quantity integer,
    status text DEFAULT 'PENDING' NOT NULL, -- PENDING, PAID, PROCESSING, COMPLETED, CANCELLED, REFUNDED, FAILED
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- deposit_requests 表 (P0)
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'Som' NOT NULL,
    payment_proof_url text,
    status text DEFAULT 'PENDING' NOT NULL, -- PENDING, APPROVED, REJECTED
    reviewer_id uuid REFERENCES public.users(id), -- 假设管理员也是 users 表中的用户
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- withdrawal_requests 表 (P0)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'Som' NOT NULL,
    withdrawal_address text NOT NULL,
    status text DEFAULT 'PENDING' NOT NULL, -- PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED
    reviewer_id uuid REFERENCES public.users(id),
    reviewed_at timestamp with time zone,
    transaction_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- shipping_records 表 (P1)
CREATE TABLE IF NOT EXISTS public.shipping_records (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid REFERENCES public.orders(id) NOT NULL,
    user_id uuid REFERENCES public.users(id) NOT NULL,
    tracking_number text,
    carrier text,
    shipping_address text NOT NULL,
    status text DEFAULT 'PENDING' NOT NULL, -- PENDING, SHIPPED, DELIVERED, FAILED
    shipped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- showoff_posts 表 (P1)
CREATE TABLE IF NOT EXISTS public.showoff_posts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) NOT NULL,
    lottery_id uuid REFERENCES public.lotteries(id),
    title text NOT NULL,
    content text NOT NULL,
    image_urls text[],
    status text DEFAULT 'PENDING' NOT NULL, -- PENDING, APPROVED, REJECTED
    reviewer_id uuid REFERENCES public.users(id),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- audit_logs 表 (P1)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id), -- 操作用户，可以是管理员
    action text NOT NULL, -- 例如: 'USER_DISABLE', 'DEPOSIT_APPROVE', 'LOTTERY_CREATE'
    target_table text,
    target_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. 创建 Dashboard 所需的存储过程 (RPC)

-- get_revenue_by_day (P0 - Dashboard)
-- 假设 orders 表中 total_amount 是以 'Som' 为单位的
CREATE OR REPLACE FUNCTION public.get_revenue_by_day(days integer)
RETURNS TABLE (date date, revenue numeric, deposits numeric)
LANGUAGE sql
AS $$
SELECT
    date_trunc('day', o.created_at)::date AS date,
    COALESCE(SUM(CASE WHEN o.type = 'LOTTERY_PURCHASE' OR o.type = 'MARKET_PURCHASE' THEN o.total_amount ELSE 0 END), 0) AS revenue,
    COALESCE(SUM(CASE WHEN o.type = 'WALLET_RECHARGE' THEN o.total_amount ELSE 0 END), 0) AS deposits
FROM
    public.orders o
WHERE
    o.status = 'COMPLETED'
    AND o.created_at >= (NOW() - make_interval(days => days))
GROUP BY
    1
ORDER BY
    1;
$$;

-- 4. RLS 策略 (管理后台使用 Service Role Key，RLS 默认关闭或宽松)
-- 默认情况下，Service Role Key 会绕过 RLS。
-- 为确保安全，我们只在 public 模式下创建表，并依赖 Service Role Key 的权限。
-- 如果需要为普通用户（前端）配置 RLS，则需要额外的迁移。
-- 对于管理后台，我们假设所有操作都使用 Service Role Key，因此不需要为这些表设置 RLS。

-- 5. 示例数据 (可选，但为了测试方便，先不添加)

-- 6. 触发器 (可选，例如 updated_at 自动更新)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 虚拟 products 表 (为了 orders 和 lotteries 关联的完整性)
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. 关联 lotteries.product_id 到 products.id
ALTER TABLE public.lotteries
ADD CONSTRAINT fk_product
FOREIGN KEY (product_id)
REFERENCES public.products(id);

-- 9. 虚拟 payment_config 表 (P1)
CREATE TABLE IF NOT EXISTS public.payment_config (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider text UNIQUE NOT NULL,
    config jsonb NOT NULL,
    is_active boolean DEFAULT TRUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TRIGGER update_payment_config_updated_at BEFORE UPDATE ON public.payment_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
