import React from 'react';
// 假设存在 EyeOffIcon 组件
// import { EyeOffIcon } from '@heroicons/react/24/outline'; 

interface EmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-center">
        {/* 占位图标 */}
        <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {/* <EyeOffIcon className="mx-auto h-12 w-12 text-gray-400" /> */}
        <h3 className="mt-2 font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-500 mt-1">
          {message}
        </p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
