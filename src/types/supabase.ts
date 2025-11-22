




export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']


import { Database } from './database.types'

// 导出完整的 Database 类型，以便在 SupabaseContext 中使用
export type DB = Database

export type { Database } from './database.types'

// Utility types for easier access
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']





export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
