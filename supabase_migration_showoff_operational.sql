-- 为 showoffs 表添加运营晒单相关字段
-- 执行时间: 2026-02-10

-- 添加 is_operational 字段，标识是否为运营创建的晒单
ALTER TABLE public.showoffs 
ADD COLUMN IF NOT EXISTS is_operational boolean DEFAULT FALSE NOT NULL;

-- 添加 is_hidden 字段，标识晒单是否隐藏
ALTER TABLE public.showoffs 
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT FALSE NOT NULL;

-- 添加 display_username 字段，存储虚拟用户昵称
ALTER TABLE public.showoffs 
ADD COLUMN IF NOT EXISTS display_username text;

-- 添加 display_avatar_url 字段，存储虚拟用户头像
ALTER TABLE public.showoffs 
ADD COLUMN IF NOT EXISTS display_avatar_url text;

-- 为 is_operational 字段创建索引，提高查询性能
CREATE INDEX IF NOT EXISTS idx_showoffs_is_operational ON public.showoffs(is_operational);

-- 为 is_hidden 字段创建索引
CREATE INDEX IF NOT EXISTS idx_showoffs_is_hidden ON public.showoffs(is_hidden);

-- 添加注释
COMMENT ON COLUMN public.showoffs.is_operational IS '标识是否为运营创建的晒单';
COMMENT ON COLUMN public.showoffs.is_hidden IS '标识晒单是否隐藏（不在前端显示）';
COMMENT ON COLUMN public.showoffs.display_username IS '虚拟用户昵称（仅用于运营晒单）';
COMMENT ON COLUMN public.showoffs.display_avatar_url IS '虚拟用户头像URL（仅用于运营晒单）';
