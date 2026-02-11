import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import toast from 'react-hot-toast';

interface DebugInfo {
  page: {
    path: string;
    title: string;
    timestamp: string;
  };
  admin: {
    id: string | null;
    username: string | null;
    role: string | null;
  };
  system: {
    userAgent: string;
    viewport: { width: number; height: number };
  };
  logs: Array<{
    time: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
  requests: Array<{
    time: string;
    method: string;
    url: string;
    status: number | null;
    statusText: string;
    error?: string;
    duration: number;
  }>;
}

export function AdminDebugPanel() {
  const { user } = useSupabase();
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    page: {
      path: window.location.pathname,
      title: document.title,
      timestamp: new Date().toISOString(),
    },
    admin: {
      id: null,
      username: null,
      role: null,
    },
    system: {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
    logs: [],
    requests: [],
  });

  // 监听右上角点击3次
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const isTopRight = e.clientX > window.innerWidth - 100 && e.clientY < 100;
      if (!isTopRight) {return;}

      const newCount = clickCount + 1;
      setClickCount(newCount);

      if (clickTimer) {clearTimeout(clickTimer);}
      const timer = setTimeout(() => setClickCount(0), 1000);
      setClickTimer(timer);

      if (newCount >= 3) {
        setIsVisible(true);
        setIsOpen(true);
        setClickCount(0);
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [clickCount, clickTimer]);

  // 更新管理员信息
  useEffect(() => {
    if (user) {
      setDebugInfo(prev => ({
        ...prev,
        admin: {
          id: user.id,
          username: (user as any).username || null,
          role: (user as any).role || null,
        },
      }));
    }
  }, [user]);

  // 拦截console
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog('info', args.join(' '), args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog('warn', args.join(' '), args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog('error', args.join(' '), args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  // 拦截fetch
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = (args[1]?.method || 'GET').toUpperCase();

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        let error: string | undefined;
        if (!response.ok) {
          try {
            const text = await response.clone().text();
            error = text;
          } catch {}
        }

        addRequest({
          time: new Date().toLocaleTimeString('zh-CN'),
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          error,
          duration,
        });

        return response;
      } catch (err: any) {
        const duration = Date.now() - startTime;
        addRequest({
          time: new Date().toLocaleTimeString('zh-CN'),
          method,
          url,
          status: null,
          statusText: '',
          error: err.message,
          duration,
        });
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const addLog = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    setDebugInfo(prev => ({
      ...prev,
      logs: [
        {
          time: new Date().toLocaleTimeString('zh-CN'),
          level,
          message,
          data,
        },
        ...prev.logs.slice(0, 49),
      ],
    }));
  };

  const addRequest = (request: DebugInfo['requests'][0]) => {
    setDebugInfo(prev => ({
      ...prev,
      requests: [request, ...prev.requests.slice(0, 19)],
    }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    toast.success('调试信息已复制到剪贴板');
  };

  const clearLogs = () => {
    setDebugInfo(prev => ({
      ...prev,
      logs: [],
      requests: [],
    }));
  };

  if (!isVisible) {return null;}

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-blue-400">🐛 管理后台调试面板</span>
            <span className="text-xs text-gray-400">{debugInfo.page.path}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
            >
              {isOpen ? '收起' : '展开'}
            </button>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
            >
              复制
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded"
            >
              清空
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 rounded"
            >
              关闭
            </button>
          </div>
        </div>

        {/* Content */}
        {isOpen && (
          <div className="max-h-[70vh] overflow-y-auto p-4 text-xs space-y-4">
            {/* Admin Info */}
            <div>
              <div className="font-bold text-green-400 mb-1">👤 管理员信息</div>
              <div className="bg-gray-800 rounded p-2 space-y-1">
                <div>ID: {debugInfo.admin.id || '未登录'}</div>
                <div>用户名: {debugInfo.admin.username || '未知'}</div>
                <div>角色: {debugInfo.admin.role || '未知'}</div>
              </div>
            </div>

            {/* Network Requests */}
            {debugInfo.requests.length > 0 && (
              <div>
                <div className="font-bold text-yellow-400 mb-1">🌐 网络请求（Supabase REST API）</div>
                <div className="bg-gray-800 rounded p-2 space-y-2 max-h-60 overflow-y-auto">
                  {debugInfo.requests.map((req, i) => {
                    // 解析Supabase REST API URL
                    let table = '';
                    const operation = req.method;
                    try {
                      const urlObj = new URL(req.url);
                      const pathParts = urlObj.pathname.split('/');
                      table = pathParts[pathParts.length - 1] || '';
                      if (table.includes('?')) {
                        table = table.split('?')[0];
                      }
                    } catch {}

                    const isSuccess = req.status && req.status < 400;
                    
                    return (
                      <div key={i} className={`p-2 rounded ${isSuccess ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono">
                            {req.time} {operation} {table || 'API'}
                            {isSuccess ? ' ✅' : ' ❌'}
                          </span>
                          <span className="text-gray-400">{req.duration}ms</span>
                        </div>
                        <div className="text-gray-400 truncate text-xs mt-1">{req.url}</div>
                        {req.error && (
                          <div className="text-red-400 mt-1 text-xs whitespace-pre-wrap">
                            {req.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Console Logs */}
            {debugInfo.logs.length > 0 && (
              <div>
                <div className="font-bold text-orange-400 mb-1">📝 控制台日志</div>
                <div className="bg-gray-800 rounded p-2 space-y-1 max-h-40 overflow-y-auto font-mono">
                  {debugInfo.logs.map((log, i) => (
                    <div key={i} className={log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'}>
                      {log.time} [{log.level.toUpperCase()}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-blue-900/30 rounded p-3 text-xs">
              <div className="font-bold text-blue-300 mb-1">💡 提示</div>
              <div className="text-gray-300 space-y-1">
                <div>• 网络请求会显示Supabase REST API调用</div>
                <div>• 查看URL可以知道查询的表名</div>
                <div>• 查看错误详情可以知道具体问题</div>
                <div>• 点击"复制"可以复制完整调试信息</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
