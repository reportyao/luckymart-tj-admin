
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white p-8 rounded-lg shadow-lg">
      <h1 className="text-6xl font-bold text-red-600">401</h1>
      <h2 className="text-2xl font-semibold mt-4 mb-2">Unauthorized Access</h2>
      <p className="text-gray-600 mb-6">
        您没有权限访问此页面。请确保您已登录。
      </p>
      <Link to="/" className="text-blue-500 hover:underline">
        返回首页
      </Link>
    </div>
  );
}
