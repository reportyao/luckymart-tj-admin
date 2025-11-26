import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';

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
  database: {
    connected: boolean;
    lastQuery: string | null;
    lastResult: any;
    lastError: string | null;
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
  queries: Array<{
    time: string;
    table: string;
    operation: string;
    success: boolean;
    rowCount: number | null;
    error?: string;
    duration: number;
  }>;
}

export function AdminDebugPanel() {
  const { supabase, user } = useSupabase();
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
    database: {
      connected: false,
      lastQuery: null,
      lastResult: null,
      lastError: null,
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
    queries: [],
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

  // 拦截Supabase查询
  useEffect(() => {
    if (!supabase) {return;}

    const originalFrom = supabase.from.bind(supabase);
    supabase.from = (table: string) => {
      const builder = originalFrom(table);
      const originalSelect = builder.select.bind(builder);
      const originalInsert = builder.insert.bind(builder);
      const originalUpdate = builder.update.bind(builder);
      const originalDelete = builder.delete.bind(builder);

      const wrapQuery = (operation: string, fn: Function) => {
        return async (...args: any[]) => {
          const startTime = Date.now();
          try {
            const result = await fn(...args);
            const duration = Date.now() - startTime;
            
            addQuery({
              time: new Date().toLocaleTimeString('zh-CN'),
              table,
              operation,
              success: !result.error,
              rowCount: result.data?.length ?? result.count ?? null,
              error: result.error?.message,
              duration,
            });

            setDebugInfo(prev => ({
              ...prev,
              database: {
                connected: true,
                lastQuery: `${operation} from ${table}`,
                lastResult: result.data,
                lastError: result.error?.message || null,
              },
            }));

            return result;
          } catch (err: any) {
            const duration = Date.now() - startTime;
            addQuery({
              time: new Date().toLocaleTimeString('zh-CN'),
              table,
              operation,
              success: false,
              rowCount: null,
              error: err.message,
              duration,
            });
            throw err;
          }
        };
      };

      builder.select = wrapQuery('SELECT', originalSelect);
      builder.insert = wrapQuery('INSERT', originalInsert);
      builder.update = wrapQuery('UPDATE', originalUpdate);
      builder.delete = wrapQuery('DELETE', originalDelete);

      return builder;
    };
  }, [supabase]);

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

  const addQuery = (query: DebugInfo['queries'][0]) => {
    setDebugInfo(prev => ({
      ...prev,
      queries: [query, ...prev.queries.slice(0, 19)],
    }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    alert('调试信息已复制到剪贴板');
  };

  const clearLogs = () => {
    setDebugInfo(prev => ({
      ...prev,
      logs: [],
      requests: [],
      queries: [],
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

            {/* Database Info */}
            <div>
              <div className="font-bold text-purple-400 mb-1">💾 数据库状态</div>
              <div className="bg-gray-800 rounded p-2 space-y-1">
                <div>连接状态: {debugInfo.database.connected ? '✅ 已连接' : '❌ 未连接'}</div>
                <div>最后查询: {debugInfo.database.lastQuery || '无'}</div>
                {debugInfo.database.lastError && (
                  <div className="text-red-400">错误: {debugInfo.database.lastError}</div>
                )}
                {debugInfo.database.lastResult && (
                  <div className="text-green-400">
                    结果: {Array.isArray(debugInfo.database.lastResult) ? `${debugInfo.database.lastResult.length} 条记录` : 'OK'}
                  </div>
                )}
              </div>
            </div>

            {/* Database Queries */}
            {debugInfo.queries.length > 0 && (
              <div>
                <div className="font-bold text-blue-400 mb-1">🔍 数据库查询记录</div>
                <div className="bg-gray-800 rounded p-2 space-y-2 max-h-40 overflow-y-auto">
                  {debugInfo.queries.map((query, i) => (
                    <div key={i} className={`p-2 rounded ${query.success ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{query.time} {query.operation} {query.table}</span>
                        <span className="text-gray-400">{query.duration}ms</span>
                      </div>
                      {query.success ? (
                        <div className="text-green-400">✅ {query.rowCount !== null ? `${query.rowCount} 行` : '成功'}</div>
                      ) : (
                        <div className="text-red-400">❌ {query.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Network Requests */}
            {debugInfo.requests.length > 0 && (
              <div>
                <div className="font-bold text-yellow-400 mb-1">🌐 网络请求</div>
                <div className="bg-gray-800 rounded p-2 space-y-2 max-h-40 overflow-y-auto">
                  {debugInfo.requests.map((req, i) => (
                    <div key={i} className={`p-2 rounded ${req.status && req.status < 400 ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{req.time} {req.method} {req.status || 'ERR'}</span>
                        <span className="text-gray-400">{req.duration}ms</span>
                      </div>
                      <div className="text-gray-400 truncate">{req.url}</div>
                      {req.error && <div className="text-red-400 mt-1">{req.error}</div>}
                    </div>
                  ))}
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
          </div>
        )}
      </div>
    </div>
  );
}
