import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { LotteryForm } from './components/Lottery/LotteryForm'
import { LotteryListPage } from './components/Lottery/LotteryListPage'
import { UserListPage } from './components/User/UserListPage'
import { UserDetailsPage } from './components/User/UserDetailsPage'
import { OrderListPage } from './components/Order/OrderListPage'
import { DepositReviewPage } from './components/Finance/DepositReviewPage'
import { WithdrawalReviewPage } from './components/Finance/WithdrawalReviewPage'
import { ShippingManagementPage } from './components/Order/ShippingManagementPage'
import { ShowoffReviewPage } from './components/Showoff/ShowoffReviewPage'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

// Simplified Admin Dashboard
function App() {
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
            <NavLink to="/lotteries" label="Lotteries" icon="🎰" />
            <NavLink to="/orders" label="Orders" icon="📦" />
            <NavLink to="/deposit-review" label="Deposits" icon="💰" />
            <NavLink to="/withdrawal-review" label="Withdrawals" icon="💸" />
            <NavLink to="/shipping-management" label="Shipping" icon="🚚" />
            <NavLink to="/showoff-review" label="Showoff" icon="📸" />
            <NavLink to="/resale-management" label="Resale" icon="🔄" />
            <NavLink to="/payment-config" label="Payment" icon="⚙️" />
            <NavLink to="/audit-logs" label="Audit Logs" icon="📋" />
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
              <Route path="/" element={<DashboardPlaceholder />} />
              <Route path="/users" element={<UserListPage />} />
              <Route path="/users/:id" element={<UserDetailsPage />} />
              <Route path="/lotteries" element={<LotteryListPage />} />
              <Route path="/lotteries/new" element={<LotteryForm />} />
              <Route path="/lotteries/:id" element={<LotteryForm />} />
              <Route path="/orders" element={<OrderListPage />} />
              <Route path="/deposit-review" element={<DepositReviewPage />} />
              <Route path="/withdrawal-review" element={<WithdrawalReviewPage />} />
              <Route path="/shipping-management" element={<ShippingManagementPage />} />
              <Route path="/showoff-review" element={<ShowoffReviewPage />} />
              <Route path="/resale-management" element={<PagePlaceholder title="Resale Management" />} />
              <Route path="/payment-config" element={<PagePlaceholder title="Payment Configuration" />} />
              <Route path="/audit-logs" element={<PagePlaceholder title="Audit Logs" />} />
            </Routes>
          </div>
        </div>
      </div>

      <Toaster position="top-center" />
    </Router>
  )
}

function NavLink({ to, label, icon }: { to: string; label: string; icon: string }) {
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

function DashboardPlaceholder() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value="1,234" />
        <StatCard title="Active Lotteries" value="12" />
        <StatCard title="Total Revenue" value="$45,678" />
        <StatCard title="Pending Orders" value="89" />
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function PagePlaceholder({ title }: { title: string }) {
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
