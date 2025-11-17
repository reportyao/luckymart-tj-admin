import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

// 假设 Button 组件有一个 loading 状态，并且在加载时显示一个 spinner
// 由于没有 Button.tsx 的具体实现，我将基于常见的 shadcn/ui 风格进行测试
// 如果测试失败，我将根据实际的 Button.tsx 内容进行调整

describe('Button Component', () => {
  // 1. 渲染测试
  describe('Rendering', () => {
    it('应该渲染按钮文本', () => {
      render(<Button>点击我</Button>)
      expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument()
    })

    it('应该在 disabled 时禁用按钮', () => {
      render(<Button disabled>禁用按钮</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  // 2. 事件测试
  describe('Events', () => {
    it('点击时应该调用 onClick 回调', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>点击</Button>)
      await user.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('禁用状态下不应该调用 onClick', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button disabled onClick={handleClick}>点击</Button>)
      await user.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })
})
