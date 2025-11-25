import React from 'react';
import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white p-8 rounded-lg shadow-lg">
      <h1 className="text-6xl font-bold text-yellow-600">403</h1>
      <h2 className="text-2xl font-semibold mt-4 mb-2">Access Forbidden</h2>
      <p className="text-gray-600 mb-6">
        您的账户没有足够的权限执行此操作或访问此页面。
      </p>
      <Link to="/" className="text-blue-500 hover:underline">
        返回首页
      </Link>
    </div>
  );
}
