import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = (import.meta as any).env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

// 管理后台使用 Service Role Key 以绕过 RLS 策略
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
