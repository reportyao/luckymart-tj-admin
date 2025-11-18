// Simple toast hook wrapper
import toast from 'react-hot-toast'

export const useToast = () => {
  return {
    toast: (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
      if (props.variant === 'destructive') {
        return toast.error(props.description || props.title || '')
      }
      return toast.success(props.description || props.title || '')
    }
  }
}
