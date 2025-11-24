import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { LotteryForm } from './components/Lottery/LotteryForm'
import { LotteryListPage } from './components/Lottery/LotteryListPage'
import { UserListPage } from './components/User/UserListPage'
import UserManagementPage from './pages/UserManagementPage'
import { UserDetailsPage } from './components/User/UserDetailsPage'
import { OrderListPage } from './components/Order/OrderListPage';
import { OrderDetailPage } from './components/Order/OrderDetailPage';
import { DepositReviewPage } from './components/Finance/DepositReviewPage'
import { PaymentConfigPage } from './pages/PaymentConfigPage'
import AlgorithmConfigPage from './pages/AlgorithmConfigPage'
import BankConfigPage from './pages/BankConfigPage'
import ResaleManagementPage from './pages/ResaleManagementPage'
import ReferralManagementPage from './pages/ReferralManagementPage'
import CommissionConfigPage from './pages/CommissionConfigPage'
import CommissionRecordsPage from './pages/CommissionRecordsPage'
import { WithdrawalReviewPage } from './components/Finance/WithdrawalReviewPage'
import { ShippingManagementPage } from './components/Order/ShippingManagementPage'
import { ShowoffReviewPage } from './components/Showoff/ShowoffReviewPage'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import React from 'react'
import { supabase } from './lib/supabase'
import { ProtectedRoute } from './components/ProtectedRoute'
import { UnauthorizedPage } from './components/UnauthorizedPage'
import { ForbiddenPage } from './components/ForbiddenPage'

// Simplified Admin Dashboard
function App(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 overflow-hidden`}>
          <div className="p-4 border-b border-gray-700">
            <h1 className="font-bold text-xl">LuckyMart Admin</h1>
          </div>
          <nav className="mt-4 space-y-2 px-2">
            <NavLink to="/" label="Dashboard" icon="📊" />
            <NavLink to="/users" label="Users" icon="👥" />
            <NavLink to="/user-management" label="User Management" icon="👤" />
            <NavLink to="/lotteries" label="Lotteries" icon="🎰" />
            <NavLink to="/orders" label="Orders" icon="📦" />
            <NavLink to="/deposit-review" label="Deposits" icon="💰" />
            <NavLink to="/withdrawal-review" label="Withdrawals" icon="💸" />
            <NavLink to="/shipping-management" label="Shipping" icon="🚚" />
            <NavLink to="/showoff-review" label="Showoff" icon="📸" />
            <NavLink to="/resale-management" label="Resale" icon="🔄" />
            <NavLink to="/payment-config" label="Payment Config" icon="⚙️" />
            <NavLink to="/bank-config" label="Bank Config" icon="🏦" />
            <NavLink to="/audit-logs" label="Audit Logs" icon="📋" />
            <NavLink to="/algorithm-config" label="Algorithm Config" icon="🧮" />
            <NavLink to="/referral-management" label="Referral Tree" icon="🌳" />
            <NavLink to="/commission-config" label="Commission Config" icon="💵" />
            <NavLink to="/commission-records" label="Commission Records" icon="📊" />
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
              <Route path="/" element={<ProtectedRoute element={<DashboardPlaceholder />} />} />
              <Route path="/users" element={<ProtectedRoute element={<UserListPage />} requiredRole="admin" />} />
              <Route path="/users/:id" element={<ProtectedRoute element={<UserDetailsPage />} requiredRole="admin" />} />
              <Route path="/user-management" element={<ProtectedRoute element={<UserManagementPage />} requiredRole="admin" />} />
              <Route path="/lotteries" element={<ProtectedRoute element={<LotteryListPage />} requiredRole="admin" />} />
              <Route path="/lotteries/new" element={<ProtectedRoute element={<LotteryForm />} requiredRole="admin" />} />
              <Route path="/lotteries/:id" element={<ProtectedRoute element={<LotteryForm />} requiredRole="admin" />} />
              <Route path="/orders" element={<ProtectedRoute element={<OrderListPage />} requiredRole="admin" />} />
              <Route path="/orders/:id" element={<ProtectedRoute element={<OrderDetailPage />} requiredRole="admin" />} />
              <Route path="/deposit-review" element={<ProtectedRoute element={<DepositReviewPage />} requiredRole="admin" />} />
              <Route path="/withdrawal-review" element={<ProtectedRoute element={<WithdrawalReviewPage />} requiredRole="admin" />} />
              <Route path="/shipping-management" element={<ProtectedRoute element={<ShippingManagementPage />} requiredRole="admin" />} />
              <Route path="/showoff-review" element={<ProtectedRoute element={<ShowoffReviewPage />} requiredRole="admin" />} />
              <Route path="/resale-management" element={<ProtectedRoute element={<ResaleManagementPage />} requiredRole="admin" />} />
              <Route path="/payment-config" element={<ProtectedRoute element={<PaymentConfigPage />} requiredRole="admin" />} />
              <Route path="/bank-config" element={<ProtectedRoute element={<BankConfigPage />} requiredRole="admin" />} />

              <Route path="/algorithm-config" element={<ProtectedRoute element={<AlgorithmConfigPage />} requiredRole="admin" />} />
              <Route path="/referral-management" element={<ProtectedRoute element={<ReferralManagementPage />} requiredRole="admin" />} />
              <Route path="/commission-config" element={<ProtectedRoute element={<CommissionConfigPage />} requiredRole="admin" />} />
              <Route path="/commission-records" element={<ProtectedRoute element={<CommissionRecordsPage />} requiredRole="admin" />} />
              <Route path="/audit-logs" element={<ProtectedRoute element={<PagePlaceholder title="Audit Logs" />} requiredRole="admin" />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
            </Routes>
          </div>
        </div>
      </div>

      <Toaster position="top-center" />
    </Router>
  )
}

function NavLink({ to, label, icon }: { to: string; label: string; icon: string }): React.ReactElement {
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

function DashboardPlaceholder(): React.ReactElement {
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-dashboard-stats')
        if (error) throw error
        setStats(data)
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers?.toLocaleString() || '0'} subtitle={`+${stats?.todayUsers || 0} today`} />
        <StatCard title="Active Lotteries" value={stats?.activeLotteries?.toString() || '0'} />
        <StatCard title="Total Revenue" value={`¥${stats?.totalRevenue || '0'}`} subtitle={`¥${stats?.todayRevenue || '0'} today`} />
        <StatCard title="Pending Tasks" value={(stats?.pendingOrders + stats?.pendingDeposits + stats?.pendingWithdrawals)?.toString() || '0'} subtitle={`${stats?.pendingDeposits || 0} deposits, ${stats?.pendingWithdrawals || 0} withdrawals`} />
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }): React.ReactElement {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function PagePlaceholder({ title }: { title: string }): React.ReactElement {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <div className="bg-gray-50 rounded p-4 text-center text-gray-500">
        <p>Page content coming soon...</p>
      </div>
    </div>
  )
}

export default App
