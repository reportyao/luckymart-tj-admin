import { logger } from '@/lib/logger'

/**
 * 设置全局错误和未处理的 Promise 拒绝处理器。
 */
export function setupGlobalErrorHandlers(): void {
  // 捕获全局未处理的错误
  window.addEventListener('error', (event) => {
    logger.error('Global uncaught error', event.error)
    // 阻止默认行为，防止浏览器控制台输出重复的错误信息
    event.preventDefault()
  })

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason)
    // 阻止默认行为
    event.preventDefault()
  })
}

/**
 * 抑制已知的、无害的 React 或第三方库警告。
 * 仅在开发环境中使用。
 */
export function suppressKnownWarnings(): void {
  if (import.meta.env.MODE === 'development') {
    const originalError = console.error
    console.error = (...args: any[]) => {
      // 忽略 React 18 的 findDOMNode 警告
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Warning: findDOMNode is deprecated in StrictMode')
      ) {
        return
      }
      // 忽略其他已知的第三方库警告
      // ...
      
      originalError.apply(console, args)
    }
  }
}
