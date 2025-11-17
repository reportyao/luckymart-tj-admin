// AD-BUG-006: API 错误处理不完整
import { toast } from 'sonner'; // 假设使用 sonner 进行通知

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public technicalMessage: string
  ) {
    super(userMessage);
    this.name = 'ApiError';
  }
}

// 统一的 API 拦截器
export async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // 无法解析 JSON，使用默认错误信息
      }
      
      // 根据状态码返回用户友好的错误信息
      const errorMessages: Record<number, string> = {
        400: '请求参数错误',
        401: '您需要重新登录',
        440: '会话超时，请重新登录', // 假设 440 是会话超时
        403: '您没有权限执行此操作',
        404: '请求的资源不存在',
        500: '服务器错误，请稍后重试',
        503: '服务暂时不可用，请稍后重试',
      };

      const userMessage = errorData.message || errorMessages[response.status] || '操作失败，请稍后重试';
      const technicalMessage = errorData.error || response.statusText;

      // 统一弹出错误通知
      toast.error(userMessage);

      throw new ApiError(
        response.status,
        userMessage,
        technicalMessage
      );
    }

    // 成功时返回 JSON 数据
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      // 已经是 ApiError，直接抛出
      throw error;
    }

    if (error instanceof TypeError) {
      // 网络连接失败
      const networkError = new ApiError(
        0,
        '网络连接失败，请检查您的网络',
        error.message
      );
      toast.error(networkError.userMessage);
      throw networkError;
    }

    // 其他未知错误
    const unknownError = new ApiError(
      500,
      '发生未知错误，请稍后重试',
      error instanceof Error ? error.message : String(error)
    );
    toast.error(unknownError.userMessage);
    throw unknownError;
  }
}

// 示例：
/*
import { fetchWithErrorHandling } from '@/services/ApiService';

interface User { id: string; name: string; }

async function getUsers(): Promise<User[]> {
  return fetchWithErrorHandling<User[]>('/api/users');
}
*/
