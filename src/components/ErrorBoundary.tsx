import { Component, ReactNode, ErrorInfo } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 你也可以将错误日志上报给服务器
    logger.error('Error caught by boundary:', { error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的 UI
      return (
        <div className="error-boundary p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-lg">
          <h1 className="text-xl font-bold mb-2">应用出错了</h1>
          <p className="mb-4">我们很抱歉，应用发生了一个错误。</p>
          <p className="text-sm font-mono mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            刷新页面
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
