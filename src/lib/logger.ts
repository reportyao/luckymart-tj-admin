const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'Authorization',
  'X-API-Key',
  'X-Auth-Token',
  'VITE_SUPABASE_ANON_KEY', // 明确添加 Supabase Anon Key
  'VITE_SUPABASE_SERVICE_ROLE_KEY', // 明确添加 Supabase Service Role Key
]

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()))) {
      sanitized[key] = '***REDACTED***'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }

  return sanitized
}

export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? sanitizeObject(data) : '')
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? sanitizeObject(error) : '')
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? sanitizeObject(data) : '')
  }
}
