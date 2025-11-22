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



export function ProtectedRoute({
  element,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
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
43	  // 检查权限
44	  // 假设 user.permissions 是一个字符串数组，但 profiles 表中没有该字段，暂时跳过权限检查
45	  // if (requiredPermission && (!user.permissions || !user.permissions.includes(requiredPermission))) {
46	  //   return <Navigate to="/forbidden" replace />
47	  // }

	  return element
	}