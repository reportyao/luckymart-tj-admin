import React, { createContext, useContext, useMemo } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { DB } from '@/types/supabase'

// 确保环境变量存在
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL, Anon Key, and Service Role Key must be provided in environment variables.')
}

interface SupabaseContextType {
  supabase: SupabaseClient<DB>
  supabaseAuth: SupabaseClient<DB>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

// 创建单例客户端，避免多次实例化
let supabaseServiceInstance: SupabaseClient<DB> | null = null

function getSupabaseClient(): SupabaseClient<DB> {
  if (!supabaseServiceInstance) {
    console.log('[Supabase] Creating service role client...');
    console.log('[Supabase] URL:', supabaseUrl);
    console.log('[Supabase] Service Role Key (first 20 chars):', supabaseServiceRoleKey.substring(0, 20) + '...');
    
    supabaseServiceInstance = createClient<DB>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        // 使用自定义存储键避免与其他实例冲突
        storageKey: 'admin-supabase-auth'
      },
      global: {
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`
        }
      },
      db: {
        schema: 'public'
      }
    });
    
    console.log('[Supabase] Service role client created successfully');
  }
  return supabaseServiceInstance
}

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clients = useMemo(() => {
    // 使用单例客户端
    const supabaseService = getSupabaseClient()

    // 为了向后兼容，supabaseAuth 也指向同一个客户端
    // 因为管理后台使用自定义的 admin_users 表进行认证，不需要 Supabase Auth
    return {
      supabase: supabaseService,
      supabaseAuth: supabaseService
    }
  }, [])

  return (
    <SupabaseContext.Provider value={clients}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
