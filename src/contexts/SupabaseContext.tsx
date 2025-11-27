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

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clients = useMemo(() => {
    // 服务端客户端：使用Service Role Key，绕过RLS限制
    const supabaseService = createClient<DB>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 认证客户端：使用Anon Key用于认证操作
    const supabaseAuthClient = createClient<DB>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    })

    return {
      supabase: supabaseService,
      supabaseAuth: supabaseAuthClient
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
