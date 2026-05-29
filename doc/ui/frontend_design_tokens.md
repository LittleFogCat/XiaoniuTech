# 前端 Design Token 与组件样式约定

## 目的

本文档用于把当前前端已经稳定成型的视觉变量、组件材质和高频 class 组合整理成一份可复用约定，方便后续新增页面或重构组件时直接沿用，而不是重复拼样式。

它不是抽象设计理论，而是面向当前代码实现的“可直接照着写”的前端样式基线。

## 主要来源

当前 token 与组件模式主要来自以下实现：

- frontend/src/index.css
- frontend/src/pages/HomePage.css
- frontend/src/components/LanguageThemeControls.jsx
- frontend/src/components/ChatInput.jsx
- frontend/src/components/Sidebar.jsx
- frontend/src/components/Login.jsx
- 以及博客、聊天、管理相关页面中的重复 class 组合

## 一、主题 Token

### 1. 页面背景与表层变量

| Token | 作用 | 暗色主题 | 浅色主题 | 使用建议 |
| --- | --- | --- | --- | --- |
| --page-bg | 全站默认页面背景 | 深海蓝 | 冷白蓝灰 | 普通页面根背景 |
| --page-bg-chat | 聊天页背景 | 更深的工作区底色 | 浅蓝工作区底色 | 聊天、沉浸式工具页 |
| --body-radial | 页面径向光斑 | 冷色半透明光斑 | 更浅的冷色光斑 | 全局 body 背景氛围层 |
| --surface-bg | 常规表层背景 | 半透明深色 | 半透明白色 | 普通卡片、普通面板 |
| --surface-bg-strong | 更强调的表层背景 | 更厚的半透明深色 | 更厚的半透明白色 | 头部、浮层、主要容器 |
| --surface-hover | hover 态表层背景 | 更亮的深色表层 | 更亮的浅色表层 | hover、可点击表层 |
| --surface-border | 标准边框色 | 低对比边框 | 低对比边框 | 常规边框 |
| --surface-border-strong | 强调边框色 | 稍重边框 | 稍重边框 | 需要更强层次时使用 |
| --surface-shadow | 表层阴影 | 深色柔和阴影 | 低透明浅色阴影 | 卡片、浮层、面板统一阴影 |
| --header-bg | 顶部头部背景 | 深色渐变 | 浅色渐变 | sticky header |

### 2. 输入与文本变量

| Token | 作用 | 使用建议 |
| --- | --- | --- |
| --input-bg | 输入框默认背景 | 文本框、选择框、表单容器 |
| --input-bg-focus | 输入框聚焦背景 | focus 态 |
| --text-primary | 主文字色 | 标题、正文重点、主按钮对比文字 |
| --text-secondary | 次文字色 | 正文、普通说明 |
| --text-muted | 辅助说明色 | 次级说明、摘要、标签次文本 |
| --text-faint | 最弱信息色 | 占位符、时间、边角元信息 |

### 3. 强调与语义变量

| Token | 作用 | 使用建议 |
| --- | --- | --- |
| --accent-solid | 主强调色 | 主按钮、激活态、链接、重点图标 |
| --accent-solid-text | 强调底上的文字色 | 主按钮和激活态文字 |
| --accent-soft | 强调色浅背景 | 激活卡片、标签底、弱提示底 |
| --accent-border | 强调色边框 | 激活边框、focus 边框、强调标签 |
| --success-soft / --success-border / --success-text | 成功语义组 | 成功标签、成功提示 |
| --warning-soft / --warning-border / --warning-text | 警告语义组 | 冷却中、提醒类提示 |
| --danger-soft / --danger-border / --danger-text | 危险语义组 | 删除、报错、危险操作 |

### 4. Token 使用规则

- 优先用 var() 变量，不要单页发明新主色。
- 如果只是业务语义变化，先尝试在现有 accent / success / warning / danger 语义里表达。
- 可以写死的颜色只限于装饰性粒子、品牌环境渐变、特殊图形发光等“氛围层”。
- 新增 token 前先判断是否只是现有 token 的组合问题，而不是变量缺失。

## 二、字体 Token

### 1. 字体栈

- 标题字体栈：Space Grotesk, Noto Sans SC, sans-serif
- 正文字体栈：Noto Sans SC, Segoe UI, sans-serif
- 等宽字体栈：IBM Plex Mono, Courier New, monospace

### 2. 用法约定

- 品牌名、页面主标题、卡片标题优先使用标题字体栈。
- 文章正文、说明文案、表单内容优先使用正文字体栈。
- 代码块、内联代码、技术片段优先使用等宽字体栈。
- 标签和模块眉标优先使用小字号、较大字距和 uppercase 处理。

### 3. 信息层级建议

- 主标题：强调识别度和品牌感，可适度使用更激进的字号和负字距。
- 卡片标题：使用标题字体，但不要抢走页面主标题层级。
- 正文：优先使用次级文字色而不是满屏高对比纯白。
- 元信息：时间、状态说明、占位符优先落在 muted / faint 层级。

## 三、圆角、阴影与模糊 Token

### 1. 圆角分层

| 层级 | 推荐写法 | 典型用途 |
| --- | --- | --- |
| 小标签 / 小按钮 | rounded-md / rounded-lg | tag、chip、小型控制项 |
| 常规控制项 | rounded-xl | 输入框、图标按钮、次级按钮 |
| 卡片 | rounded-2xl | 博客卡片、列表项卡片、资料卡 |
| 主面板 | rounded-[24px] / rounded-[28px] / rounded-[30px] | 聊天主容器、登录卡、抽屉、弹层 |
| 胶囊 / 全圆 | rounded-full | pill 按钮、标签、头像、切换器 |

### 2. 阴影与模糊

- 常规卡片和面板优先使用 shadow-[var(--surface-shadow)]。
- 弹层、抽屉、下拉菜单默认叠加 backdrop-blur-xl。
- 页头通常使用 backdrop-blur-lg。
- accent 态如果需要更亮的操作反馈，可以补一个较轻的蓝色发光阴影，但只用于主按钮、激活 tabs、语言切换激活项等少量关键位置。

## 四、布局 Token

### 1. 容器宽度模式

| 模式 | 典型宽度 | 适用场景 |
| --- | --- | --- |
| 首页宽容器 | min(1280px, calc(100vw - 32px)) | Hero、入口卡、状态面板 |
| 博客内容容器 | max-w-4xl / max-w-6xl | 列表、文章、用户主页 |
| 对话输入容器 | max-w-3xl / max-w-5xl | centered / docked 输入框 |
| 表单容器 | max-w-md | 登录、验证、短流程设置 |
| 移动抽屉 | w-[86vw] max-w-xs | 侧栏抽屉 |

### 2. 页面骨架模式

- 首页：背景氛围层 + sticky 浮层头部 + Hero 双栏 + 卡片入口区。
- 工作台页：sticky 控制头部 + 主工作面板 + 侧栏或抽屉。
- 内容页：浮层头部 + 居中内容容器 + 卡片流或正文区。
- 表单页：全屏背景 + 居中主卡片 + 辅助控制放角落或头部。

## 五、组件样式 Recipe

以下 recipe 是当前代码里已经重复出现的高频样式组合。新增组件时，优先从这里拷贝再微调。

### 1. 浮层式语言/主题控制容器

```jsx
<div className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-1 shadow-[var(--surface-shadow)] backdrop-blur-xl" />
```

适用场景：语言切换、轻量 segmented control、小型浮动控制。

### 2. 主工作面板 / 弹层容器

```jsx
<div className="rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] backdrop-blur-xl" />
```

适用场景：聊天主面板、登录卡、抽屉、菜单、模态框。

### 3. 常规内容卡片

```jsx
<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] backdrop-blur-sm" />
```

适用场景：博客列表卡、资料卡、设置卡、提示卡。

### 4. Sticky 头部

```jsx
<header className="sticky top-0 z-30 border-b border-[color:var(--surface-border)] bg-[var(--header-bg)] backdrop-blur-lg" />
```

适用场景：博客头部、聊天管理页头部、权限页头部。

### 5. 主按钮

```jsx
<button className="rounded-2xl border border-transparent bg-[var(--accent-solid)] text-[var(--accent-solid-text)] transition hover:opacity-90" />
```

适用场景：提交、确认、主要 CTA。

### 6. 次按钮

```jsx
<button className="rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]" />
```

适用场景：返回、取消、次级功能入口。

### 7. 激活态按钮 / 选中态切换

```jsx
<button className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] text-[color:var(--text-primary)]" />
```

适用场景：tab 激活态、选中列表项、当前过滤项。

### 8. 输入框

```jsx
<input className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-faint)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
```

适用场景：文本框、密码框、验证码框、搜索框。

### 9. 聊天输入容器

```jsx
<div className="relative overflow-hidden rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] transition focus-within:border-[color:var(--accent-border)] sm:rounded-[28px]" />
```

适用场景：大文本输入、回复框、富输入容器。

### 10. 强调标签

```jsx
<span className="rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-solid)]" />
```

适用场景：Agent、模块标签、状态眉标、筛选激活项。

### 11. 中性标签

```jsx
<span className="rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-2.5 py-1 text-[11px] text-[color:var(--text-secondary)]" />
```

适用场景：元信息标签、普通标识、文章 tags。

### 12. 危险提示 / 错误框

```jsx
<div className="rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[color:var(--danger-text)]" />
```

适用场景：删除提醒、报错信息、危险操作确认前提示。

### 13. 警告提示

```jsx
<div className="rounded-2xl border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-[color:var(--warning-text)]" />
```

适用场景：冷却中、速率限制、临时阻塞提示。

### 14. 抽屉与移动端侧栏

```jsx
<aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-xs rounded-r-[28px] border-r border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] backdrop-blur-xl transition-transform duration-300 ease-out" />
```

适用场景：移动端历史侧栏、移动端工具抽屉。

### 15. 遮罩层

```jsx
<div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
```

适用场景：模态框背景、弹层遮罩、移动抽屉背景。

## 六、组件状态约定

### 1. hover 约定

- 常规按钮和卡片：优先使用 hover:bg-[var(--surface-hover)]。
- 首页按钮和入口卡：允许附加轻微 translateY(-1px) 的上浮感。
- 主按钮：优先使用 hover:opacity-90，而不是大幅变色。

### 2. active / selected 约定

- 选中态优先通过 accent-soft + accent-border + text-primary 组合表达。
- 不要用“加粗描边 + 高饱和纯色底”这种与当前体系割裂的方式表达选中。

### 3. disabled 约定

- disabled 优先通过 opacity 降低 + 禁止 hover 反馈实现。
- 如果是主按钮禁用态，可以退到 surface-hover 和 text-faint，不继续保留高亮主色。

### 4. danger 约定

- 删除按钮默认是中性按钮，hover 时再切到 danger-soft / danger-text。
- 危险色尽量只在接近危险操作时显式出现，不常驻铺满界面。

## 七、响应式约定

- 保持同一套 token 和材质，不为移动端单独发明视觉系统。
- 宽容器与多栏布局在移动端收敛为单列，但 card / panel / tag / button 的外观不变。
- 桌面端主容器可保留边框和阴影；移动端可以局部去掉外层壳层，但内层主组件仍要保留 surface 语言。
- 交互重点放在触屏可点面积、抽屉转场和滚动区的视觉干净度上。

## 八、代码实现约定

### 1. 优先顺序

- 先复用现有变量。
- 再复用现有 recipe。
- 最后才新增局部样式。

### 2. class 组织建议

- 高频复用的 class 组合，优先提成常量，参考 Login.jsx 的写法。
- 组件中的状态差异，尽量只变更 border / bg / text 三类 token，不要整套重写 class。
- 如果一个样式只服务单页面氛围层，放到页面专属 CSS 里；如果是跨页面组件，优先保留在 JSX + token 的组合内。

### 3. 硬编码限制

- 不要在业务组件里硬编码新的主色 hex。
- 不要随意引入新的 box-shadow 体系。
- 不要让圆角体系失控，尽量落在既有层级里。
- 允许保留极少数首页氛围色、发光色、轨道粒子色这类装饰性硬编码。

## 九、新增组件时的最小决策流程

1. 先判断它属于主面板、普通卡片、浮层、表单控件、标签还是图标按钮。
2. 从本文对应 recipe 复制基础 class。
3. 用现有 token 补齐状态色、hover、selected、disabled。
4. 检查它在深浅主题下是否都成立。
5. 检查移动端是否只是结构收缩，而不是视觉风格改变。

## 十、落地建议

- 如果后续要继续扩展设计系统，优先把这些 recipe 向更明确的语义组件抽离，例如 SurfaceCard、FloatingPanel、AccentBadge、PrimaryButton、SecondaryButton 等。
- 如果短期仍以页面开发为主，则保持“token + Tailwind 组合”的当前方式最稳妥，不需要过早抽象成复杂样式系统。

这份文档的目标不是限制表达，而是保证新增页面仍然一眼看得出属于 XiaoNiu Tech 这一套前端界面。