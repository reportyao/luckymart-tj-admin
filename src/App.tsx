import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { LotteryForm } from './components/Lottery/LotteryForm'
import { LotteryListPage } from './components/Lottery/LotteryListPage'
import { LotteryDetailPage } from './components/Lottery/LotteryDetailPage'
import { UserListPage } from './components/User/UserListPage'
import UserManagementPage from './pages/UserManagementPage'
import { UserDetailsPage } from './components/User/UserDetailsPage'
import UserFinancialPage from './components/User/UserFinancialPage'
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
import DashboardPage from './pages/DashboardPage';
import GroupBuyProductManagementPage from './pages/GroupBuyProductManagementPage';
import GroupBuySessionManagementPage from './pages/GroupBuySessionManagementPage';
import BannerManagementPage from './pages/BannerManagementPage';
import AIManagementPage from './pages/AIManagementPage';
import PickupVerificationPage from './pages/PickupVerificationPage';
import PickupPointsPage from './pages/PickupPointsPage';
import PickupStatsPage from './pages/PickupStatsPage';
import PendingPickupsPage from './pages/PendingPickupsPage';
import InventoryProductManagementPage from './pages/InventoryProductManagementPage';
import ShipmentBatchManagementPage from './pages/ShipmentBatchManagementPage';
import OrderShipmentPage from './pages/OrderShipmentPage';
import BatchArrivalConfirmPage from './pages/BatchArrivalConfirmPage';
import BatchStatisticsPage from './pages/BatchStatisticsPage';
import ErrorLogsPage from './pages/ErrorLogsPage';

import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import LoginPage from './pages/LoginPage';
import { AdminDebugPanel } from './components/Debug/AdminDebugPanel';

// Header Component with Logout
function AppHeader({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void }): JSX.Element {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-gray-600 hover:text-gray-900"
      >
        ☰
      </button>
      <div className="flex items-center space-x-4">
        <div className="text-gray-600">
          {admin?.display_name || admin?.username}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}

// Simplified Admin Dashboard
function App(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <Router basename="/admin">
      <AdminAuthProvider>
      <AdminDebugPanel />
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 overflow-y-auto`}>
          <div className="p-4 border-b border-gray-700">
            <h1 className="font-bold text-xl">LuckyMart Admin</h1>
          </div>
          <nav className="mt-2 space-y-1 px-2 pb-4">
            <NavLink to="/" label="仪表盘" icon="📊" />
            <NavLink to="/users" label="用户列表" icon="👥" />
            <NavLink to="/user-management" label="用户管理" icon="👤" />
            <NavLink to="/referral-management" label="推荐管理" icon="🌳" />
            <NavLink to="/inventory-products" label="库存商品" icon="📦" />
            <NavLink to="/lotteries" label="积分商城活动" icon="🎰" />
            <NavLink to="/group-buy-products" label="拼团商品" icon="🛒" />
            <NavLink to="/group-buy-sessions" label="拼团会话" icon="👥" />
            <NavLink to="/orders" label="订单管理" icon="📦" />
            <NavLink to="/deposit-review" label="充值审核" icon="💰" />
            <NavLink to="/withdrawal-review" label="提现审核" icon="💸" />

            <NavLink to="/shipping-management" label="物流管理" icon="🚚" />
            <NavLink to="/shipment-batches" label="批次管理" icon="📦" />
            <NavLink to="/order-shipment" label="订单发货" icon="🚀" />
            <NavLink to="/batch-statistics" label="批次统计" icon="📊" />
            <NavLink to="/pickup-verification" label="自提核销" icon="✅" />
            <NavLink to="/pickup-points" label="自提点管理" icon="📍" />
            <NavLink to="/pickup-stats" label="核销统计" icon="📈" />
            <NavLink to="/pending-pickups" label="待核销列表" icon="📋" />
            <NavLink to="/showoff-review" label="晒单审核" icon="📸" />
            <NavLink to="/resale-management" label="转售管理" icon="🔄" />
            <NavLink to="/payment-config" label="支付配置" icon="⚙️" />
            <NavLink to="/commission-config" label="佣金配置" icon="💵" />
            <NavLink to="/commission-records" label="佣金记录" icon="📊" />
            <NavLink to="/algorithm-config" label="算法配置" icon="🧮" />
            <NavLink to="/draw-logs" label="开奖管理" icon="🎲" />
            <NavLink to="/admin-management" label="管理员管理" icon="👨‍💼" />
            <NavLink to="/permission-management" label="权限管理" icon="🔐" />
            <NavLink to="/banner-management" label="Banner管理" icon="🖼️" />
            <NavLink to="/ai-management" label="AI管理" icon="🤖" />
            <NavLink to="/error-logs" label="错误监控" icon="⚠️" />
            <NavLink to="/audit-logs" label="审计日志" icon="📋" />
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <AppHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <Routes>
          <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute element={<DashboardPage />} />} />
              <Route path="/users" element={<ProtectedRoute element={<UserListPage />} requiredRole="admin" />} />
              <Route path="/users/:id" element={<ProtectedRoute element={<UserDetailsPage />} requiredRole="admin" />} />
              <Route path="/users/:userId/financial" element={<ProtectedRoute element={<UserFinancialPage />} requiredRole="admin" />} />
              <Route path="/user-management" element={<ProtectedRoute element={<UserManagementPage />} requiredRole="admin" />} />
              <Route path="/referral-management" element={<ProtectedRoute element={<ReferralManagementPage />} requiredRole="admin" />} />
              <Route path="/inventory-products" element={<ProtectedRoute element={<InventoryProductManagementPage />} requiredRole="admin" />} />
              <Route path="/lotteries" element={<ProtectedRoute element={<LotteryListPage />} requiredRole="admin" />} />
              <Route path="/lotteries/new" element={<ProtectedRoute element={<LotteryForm />} requiredRole="admin" />} />
              <Route path="/lotteries/:id/detail" element={<ProtectedRoute element={<LotteryDetailPage />} requiredRole="admin" />} />
              <Route path="/lotteries/:id" element={<ProtectedRoute element={<LotteryForm />} requiredRole="admin" />} />
              <Route path="/group-buy-products" element={<ProtectedRoute element={<GroupBuyProductManagementPage />} requiredRole="admin" />} />
              <Route path="/group-buy-sessions" element={<ProtectedRoute element={<GroupBuySessionManagementPage />} requiredRole="admin" />} />
              <Route path="/orders" element={<ProtectedRoute element={<OrderListPage />} requiredRole="admin" />} />
              <Route path="/deposit-review" element={<ProtectedRoute element={<DepositReviewPage />} requiredRole="admin" />} />
              <Route path="/withdrawal-review" element={<ProtectedRoute element={<WithdrawalReviewPage />} requiredRole="admin" />} />
              <Route path="/shipping-management" element={<ProtectedRoute element={<ShippingManagementPage />} requiredRole="admin" />} />
              <Route path="/shipment-batches" element={<ProtectedRoute element={<ShipmentBatchManagementPage />} requiredRole="admin" />} />
              <Route path="/order-shipment" element={<ProtectedRoute element={<OrderShipmentPage />} requiredRole="admin" />} />
              <Route path="/batch-arrival-confirm/:id" element={<ProtectedRoute element={<BatchArrivalConfirmPage />} requiredRole="admin" />} />
              <Route path="/batch-statistics" element={<ProtectedRoute element={<BatchStatisticsPage />} requiredRole="admin" />} />
              <Route path="/pickup-verification" element={<ProtectedRoute element={<PickupVerificationPage />} requiredRole="admin" />} />
              <Route path="/pickup-points" element={<ProtectedRoute element={<PickupPointsPage />} requiredRole="admin" />} />
              <Route path="/pickup-stats" element={<ProtectedRoute element={<PickupStatsPage />} requiredRole="admin" />} />
              <Route path="/pending-pickups" element={<ProtectedRoute element={<PendingPickupsPage />} requiredRole="admin" />} />
              <Route path="/showoff-review" element={<ProtectedRoute element={<ShowoffReviewPage />} requiredRole="admin" />} />
              <Route path="/resale-management" element={<ProtectedRoute element={<ResaleManagementPage />} requiredRole="admin" />} />
          <Route path="/admin-management" element={<ProtectedRoute element={<AdminManagementPage />} requiredRole="super_admin" />} />
          <Route path="/permission-management" element={<ProtectedRoute element={<PermissionManagementPage />} requiredRole="super_admin" />} />
              <Route path="/payment-config" element={<ProtectedRoute element={<PaymentConfigPage />} requiredRole="admin" />} />

              <Route path="/commission-config" element={<ProtectedRoute element={<CommissionConfigPage />} requiredRole="admin" />} />
              <Route path="/commission-records" element={<ProtectedRoute element={<CommissionRecordsPage />} requiredRole="admin" />} />

              <Route path="/algorithm-config" element={<ProtectedRoute element={<AlgorithmConfigPage />} requiredRole="admin" />} />
              <Route path="/draw-logs" element={<ProtectedRoute element={<DrawLogsPage />} requiredRole="admin" />} />
              <Route path="/banner-management" element={<ProtectedRoute element={<BannerManagementPage />} requiredRole="admin" />} />
              <Route path="/ai-management" element={<ProtectedRoute element={<AIManagementPage />} requiredRole="admin" />} />
              <Route path="/error-logs" element={<ProtectedRoute element={<ErrorLogsPage />} requiredRole="admin" />} />
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
      className="flex items-center space-x-3 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-sm"
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

// Dashboard component moved to pages/DashboardPage.tsx

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
