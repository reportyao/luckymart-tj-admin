import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// 假设 useAuth hook 存在并返回 { user: { role: string, permissions: string[] } | null, loading: boolean }
// 假设 LoadingSpinner, UnauthorizedPage, ForbiddenPage 存在

interface ProtectedRouteProps {
  element: React.ReactElement
  requiredRole?: string
  requiredPermission?: string
}

// 占位组件
const LoadingSpinner = () => <div>Loading...</div>
const UnauthorizedPage = () => <div>401 - Unauthorized</div>
const ForbiddenPage = () => <div>403 - Forbidden</div>

export function ProtectedRoute({
  element,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  // 检查用户是否已认证
  // 假设未认证用户会被 useAuth 自动重定向到 /login 或 user 为 null
  if (!user) {
    // 假设 /login 路由在 App.tsx 中被定义
    return <Navigate to="/login" replace />
  }

  // 检查角色
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  // 检查权限
  // 假设 user.permissions 是一个字符串数组
  if (requiredPermission && (!user.permissions || !user.permissions.includes(requiredPermission))) {
    return <Navigate to="/forbidden" replace />
  }

  return element
}
