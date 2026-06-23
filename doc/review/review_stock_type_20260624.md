# 代码审查反馈：StockReview type 字段 & markets/todayHot 可选化

**审查日期**：2026-06-24  
**改动范围**：`backend/src/models/StockReview.js`、`backend/src/services/stockStore.js`、`doc/apis/stock.md`  
**审查结论**：✅ 接受，并修复 3 个问题

---

## 审查概览

| 文件 | 行数变化 | 评价 |
|------|---------|------|
| `backend/src/models/StockReview.js` | +4/−2 | ✅ 正确 |
| `backend/src/services/stockStore.js` | +95/−13 | ⚠️ 发现 3 个问题，已修复 |
| `doc/apis/stock.md` | +5/−3 | ✅ 正确 |

---

## 发现的问题及修复

### ① `buildReviewTitle` 与 `getWeekdayLabel` 代码重复

**严重程度**：🟡 低（不影响功能，但违反 DRY 原则）

**描述**：`buildReviewTitle` 内部重复了 `getWeekdayLabel` 的星期计算逻辑：
```js
// 改前（重复实现）
const weekday = WEEKDAY_LABELS[parsed.getUTCDay()];
```

**修复**：改为调用已有的 `getWeekdayLabel(d)`。

---

### ② `hasContent` 变量语义不清晰

**严重程度**：🟢 极低（不影响运行，但易误导后续维护者）

**描述**：`normalizeReviewInput` 中的 `hasContent` 在 partial 更新场景下，当本次请求未传 `content` 但文档已有内容时，`hasContent` 为 `false`。虽然该变量被所有使用方以 `!partial` 守卫，不会产生运行时 bug，但变量名暗示"当前文档是否有内容"，实际表达的是"本次请求是否携带非空 content"。

**修复**：加注释说明语义和适用范围。

---

### ③ 旧文档 `type` 字段缺失迁移

**严重程度**：🟡 中（不影响功能，但会导致查询筛选失效）

**描述**：`ensureGeneratedReviewDocument` 在为新旧文档回填 `title` 时，不会补写 `type` 字段。MongoDB 中存量的 StockReview 文档将保持 `type: null`，导致按 `type` 筛选时遗漏所有旧数据。

**修复**：在 `ensureGeneratedReviewDocument` 中新增迁移逻辑：`current.type == null` → `updates.type = 2`。旧文档原行为即为"今日复盘"，默认值 2 是语义一致的。

```js
if (current.type == null) {
  updates.type = 2;
}
```

该迁移在首次读取时写入一次，后续不再触发。

---

## 未发现问题的设计决策

以下设计经审查认为合理，无需修改：

| 设计点 | 审查看法 |
|--------|---------|
| `resolveReviewType()` 用当前小时判断上/下午 | ✅ 合理。`new Date()` 用服务器时钟，部署环境应保证时区正确（UTC+8）。若需改为按 review date 判断可后续迭代。 |
| `normalizeReviewInput` 中 `markets`/`todayHot` 为 `null` 时在 partial 模式下静默跳过而不报错 | ✅ 正确。partial 模式下不应因"清空字段"而报错，且当前 `updateStockReview` 用 `Object.assign`，`null` 不出现于 `nextValue` 即等于不更新。 |
| `normalizeLegacyReviewShape` 对有 content 的文档不再伪造 markets/todayHot 兜底 | ✅ 正确。否则读取纯 content 文档会返回虚假数据。 |
| `generateMissingReviewFields` 只在 `markets && todayHot` 都存在时才自生成 content | ✅ 正确。避免对纯 content 文档做无意义的模板生成。 |
| `buildReviewTitle` 对旧文档 `type==null` 默认 type=2 | ✅ 正确。`type == null` 同时匹配 `null` 和 `undefined`，语义与旧行为一致。 |
| `createStockReview` 的二次校验 | ✅ 防御性编程。`normalizeReviewInput` 已保证输入合法，这里重复校验作为最后防线无问题。 |

---

## 兼容性评估

### 存量数据
- 旧文档首次读取 → `ensureGeneratedReviewDocument` 写入 `type=2` + 重新计算 `title`（格式升级）→ 后续读取无额外开销
- 旧文档不因本次改动丢失任何字段

### API 兼容
- `POST /stock/reviews`：向后兼容（未传 type → 自动推断；未传 content → markets/todayHot 仍必填）
- `PUT /stock/reviews/:id`：向后兼容
- `GET /stock/reviews`：旧文档 type=null 在迁移前不会被 type 筛选命中 — 建议后续增加可选的 `type` 查询参数时文档说明此行为

### 前端兼容
- `StockReviewDetailPage` 已使用可选链 `review?.markets?.summary`，对 markets/todayHot 为 undefined 的文档无崩溃风险
- 前端暂未消费 `type` 字段，新增字段不影响现有页面

---

## 建议后续跟进

1. **列表接口增加 `type` 筛选参数**：当前 `buildListQuery` 不支持按 `type` 过滤，若前端需要分 tab 展示"早盘快报"/"今日复盘"，需补充。
2. **`resolveReviewType` 考虑按 review date 推断**：当前依赖服务器当前时间，若允许未来创建/补记录时自动推断可能不准确，可改为基于 `date` 字段（本次创建时前端不传 type 则用当前时间尚可接受）。
3. **`title` 已能覆盖 `type` 信息，可评估是否仍需独立 `type` 字段**：当前标题已包含"早盘快报"/"A股复盘"后缀，重复存储 type 有一定冗余，但保留有利于结构化查询。

---

*报告结束*
