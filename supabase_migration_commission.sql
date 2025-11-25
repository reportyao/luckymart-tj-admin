-- 1. 扩展 users 表：添加佣金余额
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS commission_balance numeric DEFAULT 0 NOT NULL;

-- 2. 创建 referrals 表 (邀请关系)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id uuid NOT NULL REFERENCES public.users(id),
  referred_id uuid NOT NULL REFERENCES public.users(id),
  level integer CHECK (level BETWEEN 1 AND 3),
  status text DEFAULT 'ACTIVE',
  created_at timestamp with time zone DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_referral ON public.referrals(referred_id, level);

-- 3. 创建 commissions 表 (返佣流水)
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id uuid NOT NULL REFERENCES public.users(id), -- 获佣金的用户
  source_user_id uuid NOT NULL REFERENCES public.users(id), -- 下级消费的用户
  order_id uuid REFERENCES public.orders(id), -- 订单ID，可能为空（如手动调整）
  amount numeric(10,2) NOT NULL,
  percent numeric(5,2) NOT NULL,
  level integer NOT NULL,
  status text DEFAULT 'PENDING',      -- PENDING / SETTLED
  settled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commissions_beneficiary ON public.commissions(beneficiary_id);

-- 4. 创建 commission_settings 表 (佣金比例配置)
CREATE TABLE IF NOT EXISTS public.commission_settings (
  id serial PRIMARY KEY,
  level integer UNIQUE CHECK (level BETWEEN 1 AND 3),
  percent numeric(5,2) NOT NULL,  -- 例如10=10%，最多保留2位小数
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. 插入初始数据 (如果不存在)
INSERT INTO public.commission_settings(level, percent)
VALUES (1, 10.0), (2, 5.0), (3, 2.0)
ON CONFLICT (level) DO UPDATE SET percent = EXCLUDED.percent;


-- 6. 存储过程/RPCs 扩展

-- RPC 4: 增加用户佣金余额 (用于佣金提现批准)
CREATE OR REPLACE FUNCTION public.increase_commission_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users
    SET commission_balance = commission_balance + amount
    WHERE id = user_id;
END;
$$;

-- RPC 5: 减少用户佣金余额 (用于佣金提现)
CREATE OR REPLACE FUNCTION public.decrease_commission_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users
    SET commission_balance = commission_balance - amount
    WHERE id = user_id;
    
    -- 检查余额是否足够
    IF (SELECT commission_balance FROM public.users WHERE id = user_id) < 0 THEN
        RAISE EXCEPTION 'Insufficient commission balance for user %', user_id;
    END IF;
END;
$$;

-- RPC 6: 获取佣金配置 (用于前端管理后台)
CREATE OR REPLACE FUNCTION public.get_commission_settings()
RETURNS SETOF public.commission_settings
LANGUAGE sql
AS $$
    SELECT * FROM public.commission_settings ORDER BY level;
$$;

-- RPC 7: 更新佣金配置 (用于前端管理后台)
-- 接收一个 JSON 数组，包含 {level, percent}
CREATE OR REPLACE FUNCTION public.update_commission_settings(settings_json jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    setting_record jsonb;
BEGIN
    FOR setting_record IN SELECT * FROM jsonb_array_elements(settings_json)
    LOOP
        UPDATE public.commission_settings
        SET percent = (setting_record->>'percent')::numeric,
            updated_at = now()
        WHERE level = (setting_record->>'level')::integer;
    END LOOP;
END;
$$;
