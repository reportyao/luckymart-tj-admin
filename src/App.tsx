import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { LotteryForm } from './components/Lottery/LotteryForm'
import { LotteryListPage } from './components/Lottery/LotteryListPage'
import { UserListPage } from './components/User/UserListPage'
import UserManagementPage from './pages/UserManagementPage'
import { UserDetailsPage } from './components/User/UserDetailsPage'
import { OrderListPage } from './components/Order/OrderListPage'
import { DepositReviewPage } from './components/Finance/DepositReviewPage'
import { PaymentConfigPage } from './pages/PaymentConfigPage'
import AlgorithmConfigPage from './pages/AlgorithmConfigPage'
import { WithdrawalReviewPage } from './components/Finance/WithdrawalReviewPage'
import { ShippingManagementPage } from './components/Order/ShippingManagementPage'
import { ShowoffReviewPage } from './components/Showoff/ShowoffReviewPage'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import { UnauthorizedPage } from './components/UnauthorizedPage'
import { ForbiddenPage } from './components/ForbiddenPage'
import ResaleManagementPage from './pages/ResaleManagementPage';
import AdminManagementPage from './pages/AdminManagementPage';
import PermissionManagementPage from './pages/PermissionManagementPage';
import DrawLogsPage from './pages/DrawLogsPage';
import CommissionConfigPage from './pages/CommissionConfigPage';
import CommissionRecordsPage from './pages/CommissionRecordsPage';
import ReferralManagementPage from './pages/ReferralManagementPage';

import { AdminAuthProvider } from './contexts/AdminAuthContext';
import LoginPage from './pages/LoginPage';
import { AdminDebugPanel } from './components/Debug/AdminDebugPanel';

// Simplified Admin Dashboard
function App(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <Router>
      <AdminAuthProvider>
      <AdminDebugPanel />
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 overflow-hidden`}>
          <div className="p-4 border-b border-gray-700">
            <h1 className="font-bold text-xl">LuckyMart Admin</h1>
          </div>
          <nav className="mt-4 space-y-2 px-2">
            <NavLink to="/" label="仪表盘" icon="📊" />
            <NavLink to="/users" label="用户列表" icon="👥" />
            <NavLink to="/user-management" label="用户管理" icon="👤" />
            <NavLink to="/referral-management" label="推荐管理" icon="🌳" />
            <NavLink to="/lotteries" label="夺宝活动" icon="🎰" />
            <NavLink to="/orders" label="订单管理" icon="📦" />
            <NavLink to="/deposit-review" label="充值审核" icon="💰" />
            <NavLink to="/withdrawal-review" label="提现审核" icon="💸" />

            <NavLink to="/shipping-management" label="物流管理" icon="🚚" />
            <NavLink to="/showoff-review" label="晒单审核" icon="📸" />
            <NavLink to="/resale-management" label="转售管理" icon="🔄" />
            <NavLink to="/payment-config" label="支付配置" icon="⚙️" />
            <NavLink to="/commission-config" label="佣金配置" icon="💵" />
            <NavLink to="/commission-records" label="佣金记录" icon="📊" />
            <NavLink to="/algorithm-config" label="算法配置" icon="🧮" />
            <NavLink to="/draw-logs" label="开奖管理" icon="🎲" />
            <NavLink to="/admin-management" label="管理员管理" icon="👨‍💼" />
            <NavLink to="/permission-management" label="权限管理" icon="🔐" />
            <NavLink to="/audit-logs" label="审计日志" icon="📋" />
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              ☰
            </button>
            <div className="text-gray-600">Admin Panel</div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <Routes>
          <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute element={<DashboardPlaceholder />} />} />
              <Route path="/users" element={<ProtectedRoute element={<UserListPage />} requiredRole="admin" />} />
              <Route path="/users/:id" element={<ProtectedRoute element={<UserDetailsPage />} requiredRole="admin" />} />
              <Route path="/user-management" element={<ProtectedRoute element={<UserManagementPage />} requiredRole="admin" />} />
              <Route path="/referral-management" element={<ProtectedRoute element={<ReferralManagementPage />} requiredRole="admin" />} />
              <Route path="/lotteries" element={<ProtectedRoute element={<LotteryListPage />} requiredRole="admin" />} />
              <Route path="/lotteries/new" element={<ProtectedRoute element={<LotteryForm />} requiredRole="admin" />} />
              <Route path="/lotteries/:id" element={<ProtectedRoute element={<LotteryForm />} requiredRole="admin" />} />
              <Route path="/orders" element={<ProtectedRoute element={<OrderListPage />} requiredRole="admin" />} />
              <Route path="/deposit-review" element={<ProtectedRoute element={<DepositReviewPage />} requiredRole="admin" />} />
              <Route path="/withdrawal-review" element={<ProtectedRoute element={<WithdrawalReviewPage />} requiredRole="admin" />} />
              <Route path="/shipping-management" element={<ProtectedRoute element={<ShippingManagementPage />} requiredRole="admin" />} />
              <Route path="/showoff-review" element={<ProtectedRoute element={<ShowoffReviewPage />} requiredRole="admin" />} />
              <Route path="/resale-management" element={<ProtectedRoute element={<ResaleManagementPage />} requiredRole="admin" />} />
          <Route path="/admin-management" element={<ProtectedRoute element={<AdminManagementPage />} requiredRole="super_admin" />} />
          <Route path="/permission-management" element={<ProtectedRoute element={<PermissionManagementPage />} requiredRole="super_admin" />} />
              <Route path="/payment-config" element={<ProtectedRoute element={<PaymentConfigPage />} requiredRole="admin" />} />

              <Route path="/commission-config" element={<ProtectedRoute element={<CommissionConfigPage />} requiredRole="admin" />} />
              <Route path="/commission-records" element={<ProtectedRoute element={<CommissionRecordsPage />} requiredRole="admin" />} />

              <Route path="/algorithm-config" element={<ProtectedRoute element={<AlgorithmConfigPage />} requiredRole="admin" />} />
              <Route path="/draw-logs" element={<ProtectedRoute element={<DrawLogsPage />} requiredRole="admin" />} />
              <Route path="/audit-logs" element={<ProtectedRoute element={<PagePlaceholder title="Audit Logs" />} requiredRole="admin" />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
            </Routes>
          </div>
        </div>
      </div>

      <Toaster position="top-center" />
          </AdminAuthProvider>
    </Router>
  )
}

function NavLink({ to, label, icon }: { to: string; label: string; icon: string }): JSX.Element {
  return (
    <Link
      to={to}
      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function DashboardPlaceholder(): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-3xl font-bold mb-4">仪表盘</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="总用户数" value="1,234" />
        <StatCard title="进行中的活动" value="12" />
        <StatCard title="总收入" value="$45,678" />
        <StatCard title="待处理订单" value="89" />
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }): JSX.Element {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function PagePlaceholder({ title }: { title: string }): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <div className="bg-gray-50 rounded p-4 text-center text-gray-500">
        <p>页面内容即将推出...</p>
      </div>
    </div>
  )
}

export default App
