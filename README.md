# LuckyMart Admin Dashboard

管理后台应用 - 用于管理 LuckyMart 平台的所有管理功能。

## 项目特性

- 🎨 现代化的 React 18 + TypeScript 管理界面
- 🔐 Supabase 集成，支持实时数据库操作
- 🌍 多语言支持 (中文、俄语、塔吉克语)
- 📱 响应式设计，支持移动端
- ⚡ Vite 构建，快速开发体验

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```

服务器将在 `http://localhost:5176` 启动

### 构建生产版本
```bash
pnpm build
```

### 类型检查
```bash
pnpm tsc --noEmit
```

## 环境变量

创建 `.env.local` 文件，配置以下环境变量：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 项目结构

```
src/
├── components/          # React 组件
│   ├── ui/             # 基础 UI 组件
│   └── admin/          # 管理相关组件
├── pages/              # 页面组件
├── lib/                # 工具库和 API 封装
├── contexts/           # React Context
├── hooks/              # 自定义 Hooks
├── i18n/               # 国际化配置
├── types/              # TypeScript 类型定义
├── App.tsx             # 主应用组件
└── main.tsx            # 应用入口
```

## 功能模块

### 已实现
- ✅ 仪表板 (Dashboard)
- ✅ 用户管理 (User Management)
- ✅ 商品管理 (Lottery Management)
- ✅ 订单管理 (Order Management)
- ✅ 充值审核 (Deposit Review)
- ✅ 提现审核 (Withdrawal Review)
- ✅ 发货管理 (Shipping Management)
- ✅ 晒单审核 (Showoff Review)
- ✅ 转售管理 (Resale Management)
- ✅ 支付配置 (Payment Configuration)
- ✅ 审计日志 (Audit Logs)

### 待开发
- 📋 详细的数据表格和筛选
- 📊 数据可视化和统计
- 🔔 实时通知系统
- 📤 数据导出功能

## 技术栈

- **前端框架**: React 18
- **类型系统**: TypeScript 5
- **构建工具**: Vite 7
- **样式**: Tailwind CSS 4
- **后端服务**: Supabase
- **路由**: React Router 7
- **UI 组件**: Radix UI
- **国际化**: i18next
- **通知**: React Hot Toast

## 开发指南

### 添加新页面

1. 在 `src/pages/` 创建新页面组件
2. 在 `src/App.tsx` 中添加路由
3. 在侧边栏导航中添加链接

### 添加新组件

1. 在 `src/components/` 创建组件
2. 导出组件供其他模块使用

### 国际化

所有文本应使用 i18next 进行国际化处理：

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <div>{t('key.name')}</div>
}
```

## API 集成

所有 API 调用通过 Supabase 进行：

```tsx
import { supabase } from '@/lib/supabase'

// 查询数据
const { data, error } = await supabase
  .from('table_name')
  .select('*')

// 插入数据
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column: 'value' }])
```

## 部署

### Vercel 部署

```bash
vercel deploy
```

### 自定义服务器部署

```bash
# 构建
pnpm build

# 上传 dist 文件夹到服务器
# 配置 Web 服务器（Nginx/Apache）指向 dist/index.html
```

## 常见问题

### Q: 如何修改管理员认证？
A: 编辑 `src/lib/supabase.ts` 中的认证逻辑

### Q: 如何添加新的管理员用户？
A: 在 Supabase 数据库中的 `admin_users` 表添加用户记录

### Q: 如何修改侧边栏导航？
A: 编辑 `src/App.tsx` 中的 `NavLink` 组件列表

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系开发团队。
