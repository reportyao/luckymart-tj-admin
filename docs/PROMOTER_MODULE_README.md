# 地推管理模块 - P0 开发说明

## 概述

本模块为 TezBarakat 管理后台新增的**地推管理**功能，包含四个独立页面，通过侧边栏独立菜单入口访问。

## 新增文件清单

### 页面组件 (`src/pages/`)

| 文件 | 功能 | 说明 |
|:---|:---|:---|
| `PromoterDashboardPage.tsx` | 地推作战指挥室 | 实时看板，含概览卡片、英雄榜排名、点位概况、趋势对比 |
| `PromoterManagementPage.tsx` | 地推人员管理 | 三Tab页（人员/团队/点位），完整CRUD，搜索导出 |
| `PromoterReportsPage.tsx` | KPI报表 | 三视图（汇总/每日/团队），日期范围筛选，成本核算，CSV导出 |
| `DepositAlertsPage.tsx` | 充值告警中心 | 实时监控充值审核，智能分类告警，30秒自动刷新，凭证查看 |

### 数据库迁移 (`docs/migrations/`)

| 文件 | 说明 |
|:---|:---|
| `001_promoter_system.sql` | 4张新表 + 3个RPC函数的完整SQL |

### 修改文件

| 文件 | 修改内容 |
|:---|:---|
| `src/App.tsx` | 新增4个import、4条路由、侧边栏"地推管理"分组菜单、NavSection组件 |

## 部署步骤

### 1. 执行数据库迁移

在 Supabase Dashboard > SQL Editor 中执行：

```
docs/migrations/001_promoter_system.sql
```

该脚本会创建：
- `promoter_teams` - 地推团队表
- `promotion_points` - 推广点位表
- `promoter_profiles` - 地推人员档案表
- `promoter_daily_logs` - 每日工作日志表
- `get_promoter_dashboard_stats()` - 指挥室统计RPC
- `get_promoter_leaderboard()` - 排行榜RPC
- `get_promoter_daily_trend()` - 每日趋势RPC

### 2. 构建部署

```bash
pnpm install
pnpm build
```

### 3. 验证

1. 访问管理后台，侧边栏应出现"地推管理"分组
2. 点击"地推指挥室"验证看板加载
3. 点击"人员管理"添加测试地推人员
4. 点击"KPI报表"验证报表生成
5. 点击"充值告警"验证告警监控

## 代码风格说明

本模块严格遵循现有代码风格：

- **数据获取**: `useSupabase()` hook + Supabase client
- **认证**: `useAdminAuth()` + `ProtectedRoute` (requiredRole: "admin")
- **UI组件**: shadcn/ui (Card, Table, Button, Dialog) + Tailwind CSS
- **图标**: lucide-react
- **通知**: react-hot-toast
- **状态管理**: React useState + useCallback + useEffect
- **导出**: 前端生成CSV（含BOM头支持中文Excel打开）

## 告警分类规则

充值告警中心按以下优先级分类：

| 类型 | 条件 | 颜色 |
|:---|:---|:---|
| 超时 | 等待超过阈值（默认30分钟） | 红色 |
| 大额 | 金额超过阈值（默认500 TJS） | 橙色 |
| 频繁 | 同一用户短时间多笔（默认10分钟3笔） | 紫色 |
| 地推 | 用户由地推人员推荐 | 蓝色 |
| 待审 | 普通待审核 | 灰色 |

所有阈值可通过页面右上角"告警配置"按钮实时调整。

## 与现有系统的关系

- **三级分销**: 地推人员的邀请码直接复用 `profiles.referral_code`，其推荐的用户自动进入三级分销体系
- **充值审核**: 充值告警页面调用与现有 `DepositReviewPage` 相同的审核接口 (`approve-deposit` Edge Function)
- **用户系统**: 地推人员必须是已注册的平台用户，通过 `promoter_profiles.user_id` 关联
