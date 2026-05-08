# Statistics 模块

所有路径前缀 `/api`。

## 记录页面进入

### POST /api/statistics/enter

不要求认证。前端 `StatisticsTracker` 组件在页面加载时调用。

```json
// Request
{
  "path": "/blog/post/abc123",
  "referrer": "https://example.com",
  "sessionId": "client-generated-session-uuid",
  "resolution": "1920x1080",
  "userAgent": "..."
}
```

## 记录页面离开

### POST /api/statistics/exit

不要求认证。前端在 `beforeunload` 时通过 `navigator.sendBeacon` 发送。

```json
// Request
{
  "sessionId": "...",
  "durationMs": 45320
}
```

## 查看统计概览

### GET /api/statistics/overview

需要 `statistics:view` 权限。支持日期范围查询。

## 导出统计数据

### GET /api/statistics/export

需要 `statistics:export` 权限。
