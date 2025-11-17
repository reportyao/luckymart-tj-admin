import { Database } from '../../database.types.ts'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// 导出完整的 Database 类型，以便在 SupabaseContext 中使用
export type DB = Database
