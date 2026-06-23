# Review: StockReview `type` 字段 & 条件必填逻辑

**Date:** 2026-06-24
**Branch:** master (uncommitted)
**Files changed:**

- `backend/src/models/StockReview.js`
- `backend/src/services/stockStore.js`
- `doc/apis/stock.md`

## 概述

本变更为 StockReview 模型新增 `type` 字段，区分「早盘快报」(type=1) 和「今日复盘」(type=2)。同时让 `markets` 和 `todayHot` 在提供了 `content`（markdown 正文）时变为可选，支持纯内容型复盘而无需结构化市场数据。API 文档已同步更新。

---

## Schema 变更 (`StockReview.js`)

- **L240, L243**：移除 `markets` 和 `todayHot` 的 `required: true` — 正确，因为它们现在是条件必填。
- **L244-248**：新增 `type` 字段，type=Number，default=2，enum=[1, 2] — 清晰恰当。

## 服务层 (`stockStore.js`)

### `normalizeType`

正确处理 `0`、`undefined` 和 `null` 为「自动检测」。app 层与 Mongoose schema 之间有一处表面上的不一致：错误信息写 `0（自动）`，但 schema enum 仅允许 `[1, 2]`。`normalizeType` 在持久化之前进行了必要的转换，逻辑正确。

### `normalizeReviewInput`

有条件地要求 `markets`/`todayHot` 的逻辑功能正确，但控制流可以更简洁。当前嵌套的 `if/else if` 不够直观：

```js
// 当前写法
if (!partial || payload.markets !== undefined) {
    if (payload.markets !== undefined && payload.markets !== null) {
      nextValue.markets = normalizeMarkets(payload.markets);
    } else if (!partial && !hasContent) {
      throw createHttpError('...');
    }
}
```

建议简化为：

```js
if (payload.markets != null) {
  nextValue.markets = normalizeMarkets(payload.markets);
} else if (!partial && !hasContent) {
  throw createHttpError('...');
}
```

当 no-content + full-create 路径已被外层守护时，`!partial ||` 守卫是多余的。

### `resolveReviewType`

该函数承担两种职责，容易混淆：

1. 不带参数调用 → 根据当前时间自动检测类型
2. 带参数 (1 或 2) 调用 → 透传原值

建议拆分为两个函数：

```js
function detectReviewType() {
  return new Date().getHours() < 12 ? 1 : 2;
}

function reviewTypeLabel(type) {
  return type === 1 ? '早盘快报' : 'A股复盘';
}
```

### `buildReviewTitle`

L590 的 null 回退逻辑：

```js
const effectiveType = type == null ? 2 : resolveReviewType(type);
```

当 `type` 为 null 时默认为 2，跳过了自动检测。这仅影响旧文档（创建时无 type 字段），回退到「复盘」是合理的默认值。

### `createStockReview` 中的冗余验证 (L920-923)

```js
if (isBlankText(input.content) && (!input.markets || !input.todayHot)) {
    if (!input.markets) throw createHttpError('...');
    if (!input.todayHot) throw createHttpError('...');
}
```

相同的检查已由 `normalizeReviewInput` 对非 partial 场景执行。若确需保留两者，请加注释说明原因。

### 潜在问题：类型变更时不更新标题

若以 type=1 创建了复盘（标题自动生成为 "早盘快报"），之后将 type 更新为 2，`generateMissingReviewFields` 中的 `isBlankText` 守卫会跳过标题更新（因为标题非空）。用户将得到标题仍为「早盘快报」的复盘。

当前无法区分「用户自定义标题」与「自动生成标题」，因此没有优雅的修复方式。一个务实的方案：当标题匹配自动生成模式时始终重新生成。

---

## API 文档 (`stock.md`)

与代码变更一致。`type` 字段、`markets`/`todayHot` 条件必填、以及两种类型的标题格式文档清晰准确。

---

## 总结

| 方面 | 评估 |
|--------|-----------|
| 正确性 | ✅ 健全 — 边界情况（旧文档、null/0/undefined type、partial update）处理得当 |
| 安全性 | ✅ 无新增问题 — 类型转换使用了 `Number()` |
| 代码质量 | ⚠️ `normalizeReviewInput` 嵌套条件可简化；`resolveReviewType` 违反单一职责 |
| 文档 | ✅ 与实现一致 |
| 测试 | ❌ diff 中无新增测试 |

## 建议

1. 从 `createStockReview` 移除 L920-923 冗余验证（或加注释说明必要性）。
2. 将 `resolveReviewType()` 拆分为 `detectReviewType()`（自动检测）和 `reviewTypeLabel()`（格式化），使调用点意图更清晰。
3. 为新的 type-dependent 行为补充测试：自动检测、两种类型的标题生成、content-only 的创建/更新路径。
