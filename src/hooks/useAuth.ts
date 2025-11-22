import { useState, useEffect } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'

export interface AuthUser {
  id: string
  email?: string
  role?: string
}

export function useAuth() {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 获取当前用户session
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // 查询用户角色 (假设在 profiles 表中有 role 字段)
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single()
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            role: profile?.is_admin ? 'admin' : 'user'
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUser({
              id: session.user.id,
              email: session.user.email,
              role: profile?.is_admin ? 'admin' : 'user'
            })
          })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, isLoading }
}
