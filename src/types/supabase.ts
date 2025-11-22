




export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

import { Database } from '../../database.types'

// 导出完整的 Database 类型，以便在 SupabaseContext 中使用
export type DB = Database

export type { Database, TablesInsert, TablesUpdate, Enums as DBEnums } from '../../database.types'



