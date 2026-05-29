# 前端 UI 风格总结

## 一句话概括

XiaoNiu Tech 当前前端 UI 采用的是一套偏“个人工作台 / AI 实验室”的科技感视觉语言：以深海蓝和冷灰为基底，以青蓝色作为主强调色，广泛使用半透明磨砂卡片、大圆角、细边框、柔和阴影和少量发光动效。在气质上，它不是传统企业后台，也不是强营销的落地页，而是强调安静、克制、专业、带一点未来感的个人产品界面。

## 视觉定位

- 暗色优先，但完整支持浅色主题切换。
- 整体情绪偏冷静、技术化、轻实验感。
- 页面更像一组可组合的“工作面板”，而不是强装饰性海报。
- 首页承担品牌展示和氛围营造，聊天、博客、设置、管理页则回到高可用性的内容界面。

可以概括为以下几个关键词：

- 科技感
- 玻璃拟态
- 深色工作台
- 冷色霓虹点缀
- 大圆角卡片
- 内容优先
- 轻动效

## 色彩系统

### 1. 基础底色

暗色主题以深蓝黑为主，页面主背景接近夜空或控制台界面：

- 页面背景是深海蓝而不是纯黑。
- 聊天页有独立的更深背景色，强调沉浸式工作区。
- 页面常叠加大面积径向渐变，让底色不显得死板。

浅色主题不是简单反相，而是保留相同层级关系：

- 背景切换为冷白、浅蓝灰。
- 卡片仍然保持半透明与分层感。
- 强调色仍保持蓝青体系，保证品牌连续性。

### 2. 强调色

全局主强调色是青蓝色，承担以下角色：

- 主按钮填充色
- 可交互控件的激活态
- 链接颜色
- 标签、徽标、模块标题的小面积高亮
- 聚焦边框与部分阴影光晕

这套强调色使用得比较克制，通常只出现在操作焦点、状态标签和关键 CTA 上，不会铺满整屏。

### 3. 状态色

成功、警告、危险状态都有独立的浅背景、边框和文字色，但同样遵循低饱和半透明风格，不会破坏整体冷静基调。

## 字体与信息层级

前端采用了明确的双字体体系：

- 标题字体：Space Grotesk
- 正文字体：Noto Sans SC
- 代码字体：IBM Plex Mono

它们的分工非常清晰：

- 品牌名、页面标题、卡片标题使用 Space Grotesk，强化科技感和识别度。
- 大段正文、说明、表单、文章内容使用 Noto Sans SC，保证中文可读性。
- 代码块、内联代码、技术内容使用 IBM Plex Mono，形成工程化气质。

信息层级还有几个明显特征：

- 小标签常用全大写或高字距 uppercase 样式。
- 主标题字号偏大，尤其首页 Hero 标题非常夸张，强调品牌感。
- 正文颜色不是纯白，更多使用次级文字色，减少高对比疲劳。
- 元信息如时间、标签、统计数常用更浅的 muted/faint 色阶。

## 形状、边框与材质

### 1. 大圆角

这套 UI 很依赖大圆角建立统一识别：

- 面板和卡片通常在 18px 到 30px 左右。
- 按钮、切换器、状态胶囊大量使用圆角矩形。
- 一级操作按钮或头像入口经常直接使用全圆角 pill 形态。

整体观感会更柔和，也削弱了传统后台的生硬感。

### 2. 玻璃拟态材质

核心组件几乎都遵循同一套材质语言：

- 半透明背景
- 低对比边框
- 柔和阴影
- backdrop blur

这使得头部、下拉菜单、卡片、对话面板、弹窗都像漂浮在背景上的“磨砂层”，是当前 UI 最核心的统一特征之一。

### 3. 细边框而非重分割

UI 不依赖粗线条做结构，而是依赖：

- 细边框
- 浅色差背景
- 圆角容器
- 阴影层次

这让界面显得更现代，也更适合深色主题。

## 布局语言

### 1. 页面不是铺满，而是有明确容器宽度

无论首页、博客还是管理页，内容通常都被约束在可控宽度内：

- 首页使用较宽但仍有边距的中心容器。
- 博客页偏内容优先，主体宽度更收敛。
- 聊天页在桌面端是“头部 + 面板 + 侧边栏”的工作台结构。

### 2. 卡片化布局是默认组织方式

大多数页面都不是裸排版，而是通过卡片和面板组织信息：

- 博客文章列表是卡片流。
- 用户主页是资料卡 + 文章卡。
- 聊天页是消息卡、输入卡、侧栏卡、弹出菜单卡。
- 管理页是分栏卡片和表单卡片。

### 3. 头部偏悬浮式

顶部导航常是 sticky，并叠加以下样式：

- 半透明背景
- 模糊滤镜
- 细边框
- 滚动后状态增强

因此头部不像实体导航条，更像浮在页面上的控制条。

## 页面气质拆分

### 首页

首页是全站最有“设计表达”的页面，核心特征包括：

- 大号 Hero 标题
- 径向光斑背景
- 轻量网格底纹
- 轨道、彗星、粒子、超新星等交互动效
- 圆角巨大的状态面板和入口卡片

它的作用不是信息堆叠，而是先建立“个人科技产品”的第一印象。

### 聊天页

聊天页风格从展示型切换到工具型，但仍保留统一材质：

- 页面背景更深，突出沉浸式会话环境。
- 主体是带模糊和阴影的工作面板。
- 侧边栏、模型选择器、身份选择器、消息卡片都遵循同一套圆角玻璃组件风格。
- 浮动按钮、切换按钮、状态标签继续使用蓝青色强调。

整体像一个轻量桌面应用，而不是普通 IM 页面。

### 博客相关页面

博客页比首页和聊天页更克制，重点放在内容可读性：

- 头部仍保留半透明悬浮导航。
- 卡片保留磨砂与边框，但动效明显减少。
- 标题、摘要、标签、统计信息的层级划分清楚。
- 文章正文的 Markdown 样式经过专门统一，保证代码块、表格、引用块都与整体主题一致。

博客区可以理解为“保留品牌气质的内容阅读模式”。

### 登录、设置、管理页

这类页面在视觉上比较统一：

- 使用居中大卡片或分栏卡片
- 表单控件半透明、圆角较大
- 激活态靠强调色和边框区分
- 信息密度比首页高，但不会退回传统后台风格

它们延续的是同一设计系统，只是减少氛围表达，增强操作效率。

## 组件风格规律

### 1. 按钮

按钮大致分三类：

- 主按钮：蓝青渐变或纯强调色填充，白字，高光阴影
- 次按钮：半透明表面，细边框，hover 时轻微提亮
- 幽灵按钮：透明背景，更多用于次级跳转

交互上通常只做轻微上浮、透明度变化或背景切换，不做夸张动画。

### 2. 输入框与选择器

表单控件遵循统一规则：

- 半透明背景
- 柔和边框
- focus 时切到强调色边框
- 文字颜色高于占位符颜色

选择器和下拉弹层保持与卡片相同的材质，避免“原生控件”感过强。

### 3. 标签与状态徽标

标签设计很有辨识度：

- 通常尺寸较小
- 使用圆角胶囊形态
- 字号偏小，字距偏大
- 经常使用 uppercase
- 激活标签会带强调色边框和浅底色

这套标签语言在首页状态、聊天角色、模型/身份属性、博客标签、管理页模块标签中反复出现。

### 4. 弹窗、下拉、菜单

弹出层普遍不是纯色面板，而是：

- 更强的 surface 背景
- 更明显的模糊
- 保留阴影和圆角

因此整个系统的浮层体验比较统一，不会出现页面和弹层像两套皮肤的情况。

## 动效风格

这套前端的动效不是为了炫技，而是服务氛围和状态反馈。

主要特征如下：

- 首页有环境漂浮、网格、轨道旋转、脉冲、粒子、彗星等视觉动效。
- 按钮和卡片 hover 常伴随 1px 左右的轻微位移。
- 抽屉、侧边栏、浮层以短时长平移动画出现。
- 主题切换专门延长了颜色与阴影过渡时间，让深浅主题切换更平滑。
- 滚动条被做得很细，并带有自动显隐倾向，尽量减少视觉噪音。

整体原则是：有生命感，但不喧宾夺主。

## 内容样式与 Markdown 呈现

博客和聊天中都存在 Markdown 内容，因此正文样式被单独统一处理：

- 代码块使用独立背景、边框和圆角
- 内联代码使用浅强调背景
- 链接保持强调色并带下划线
- 表格、引用块、图片、分隔线都有统一规则
- 标题颜色和层级与整站标题语言保持一致

这说明 UI 风格不仅覆盖“壳层界面”，也覆盖技术内容本身的阅读体验。

## 响应式特征

当前响应式策略不是重新设计一套移动端，而是延续同一视觉系统并做结构收缩：

- 桌面端强调卡片边界、阴影和悬浮感。
- 移动端保留配色和组件材质，但减少横向分栏。
- 侧边栏在移动端切换为抽屉。
- 某些桌面端的大圆角、边框和外层阴影会被适度收敛，保证可用区域。

因此不同设备看到的是同一种设计语言，而不是两套割裂风格。

## 设计系统结论

如果要用一句更准确的话总结这套前端风格，可以写成：

> 一套以深海蓝和青蓝强调色为核心、以玻璃拟态卡片和大圆角组件为载体、兼顾品牌展示与工具效率的个人科技工作台 UI。

它的几个最稳定、最值得延续的设计规则是：

- 优先复用全局颜色变量，不单页自定义跳脱色板。
- 标题继续使用 Space Grotesk，正文继续使用 Noto Sans SC，代码继续使用 IBM Plex Mono。
- 新组件优先使用半透明 surface、细边框、柔和阴影和大圆角。
- 交互反馈维持轻量，不做高噪音动画。
- 内容页以可读性优先，展示页再适度加入氛围动效。
- 弹层、菜单、抽屉与主页面保持同一材质体系。

## 适合后续新增页面的实现原则

后续如果继续扩展前端页面，建议默认遵循以下方向：

1. 新页面先从现有 design token 出发，而不是重新定义颜色和阴影。
2. 如果是工具页，优先沿用聊天页和管理页的工作台式布局。
3. 如果是内容页，优先沿用博客页的卡片式内容组织和 Markdown 呈现规则。
4. 如果是品牌或入口页，可以借用首页的环境光斑、网格和少量轨道式动效，但应控制在局部区域。
5. 所有新增浮层、抽屉、弹窗都应继承当前的玻璃拟态风格，避免出现突兀的纯白或纯黑原生面板。

## 执行版设计规范清单

这一节用于把上面的风格总结落成“做页面时该怎么选、怎么写、怎么自检”的执行版清单。

### 1. 页面立项时先判断页面类型

- 品牌入口页：沿用首页的氛围型表达，允许使用环境光斑、网格纹理、局部动效和更强的 Hero 排版。
- 工具工作台页：沿用聊天页和管理页的工作区布局，重点是头部控制条、卡片面板、侧栏和高频操作区。
- 内容阅读页：沿用博客页的内容优先策略，强化标题、摘要、正文和 Markdown 阅读体验。
- 表单/设置页：沿用登录页和设置页的中密度交互布局，减少氛围动效，增强输入、提交和状态反馈。

如果一个新页面无法被归到这四类之一，默认按“工具工作台页”处理，再局部加品牌化元素。

### 2. 页面骨架默认规则

- 优先使用有明确宽度上限的居中容器，不做无边界铺满式布局。
- 顶部导航优先使用 sticky + 半透明 + backdrop blur 的浮层式头部。
- 内容优先通过卡片、面板、分栏来组织，而不是靠大块纯背景硬切区域。
- 页面主体优先复用现有外观层级：背景层、浮层头部、主卡片/主面板、次级卡片、浮动操作层。

### 3. 颜色使用清单

- 页面底色必须优先使用全局变量，不单页私自定义主背景色。
- 可交互高亮默认使用青蓝色强调体系，不新增第二主色。
- 卡片、面板、浮层统一使用 surface 系列变量，不直接写死白底或黑底。
- 成功、警告、危险状态统一使用 success/warning/danger 语义变量。
- 允许写死颜色的场景仅限于首页这类装饰性粒子、轨道、环境渐变等“氛围层”。

### 4. 字体与排版清单

- 品牌标题、页面大标题、卡片标题默认使用 Space Grotesk + Noto Sans SC 组合。
- 正文、说明、表单、文章内容默认使用 Noto Sans SC。
- 代码块、内联代码、技术片段默认使用 IBM Plex Mono。
- 小标签、模块名、状态眉标优先使用 uppercase + 较大字距的写法。
- 正文默认不使用纯白文本，优先使用 text-secondary 或 text-muted 控制阅读对比度。

### 5. 圆角、边框、阴影清单

- 大面板、主容器优先使用 24px 到 30px 的圆角。
- 常规卡片优先使用 16px 到 24px 的圆角。
- 标签、头像入口、切换器优先使用 pill 或 full rounded 形态。
- 边框默认使用细边框，不使用粗描边。
- 阴影默认优先复用 surface-shadow，不私自加重投影层级。

### 6. 组件实现清单

- 主按钮：强调色实体填充，亮色文字，hover 只做轻量变化。
- 次按钮：surface 背景 + border，hover 时提亮背景或文字。
- 输入框：input-bg 背景，focus 后切 accent-border 和 input-bg-focus。
- 下拉、菜单、抽屉、弹窗：统一使用 stronger surface 背景 + shadow + blur。
- 标签：小尺寸、圆角胶囊、较大字距、语义化颜色。
- 图标按钮：保持和普通按钮一致的边框、背景、hover 逻辑，不要变成另一套风格。

### 7. 动效与反馈清单

- hover 位移控制在轻微级别，通常 1px 左右即可。
- 浮层、抽屉、菜单优先使用 150ms 到 300ms 的短时长过渡。
- 页面级动态装饰优先放在品牌入口页，不扩散到所有业务页。
- 主题切换、状态切换以平滑过渡为主，不使用高噪音动画。
- 动效必须服务状态变化或氛围表达，不能为了“有动效”而动效。

### 8. 响应式清单

- 移动端保持同一套颜色、材质和字体系，不重做另一套视觉风格。
- 桌面端可使用分栏、悬浮边界和大圆角；移动端优先收束为单列或抽屉结构。
- 桌面端的边距、阴影、外层包裹可以在移动端适度减弱，但不能完全丢失层级感。
- 所有浮层与抽屉都要考虑安全区、最大高度和触屏点击面积。

### 9. 页面交付前自检清单

- 是否全部优先复用了现有 CSS 变量，而不是临时写死新颜色。
- 是否仍然保持 Space Grotesk / Noto Sans SC / IBM Plex Mono 的既有分工。
- 是否所有卡片、浮层、菜单、弹窗仍属于同一套玻璃拟态材质。
- 是否按钮、输入框、标签、图标按钮与现有组件状态逻辑一致。
- 是否移动端只是结构收缩，而不是风格走样。
- 是否只在需要氛围表达的页面使用装饰性动效。
- 是否避免了纯白硬面板、纯黑硬遮罩、方角大块、过度饱和色等破坏性元素。

### 10. 禁止项

- 不要为单个页面重新发明主色板。
- 不要引入与现有体系冲突的圆角、阴影和边框重量。
- 不要让管理页退化成传统生硬后台表格风格。
- 不要让内容页为了“设计感”牺牲文章、代码和表单的可读性。
- 不要把首页的重装饰动效无差别复制到聊天、博客、管理页。
- 不要在弹层、抽屉、菜单里使用与主界面割裂的纯原生样式。

## 说明

本文总结基于当前前端实现提炼，主要观察来源包括：

- 全局样式变量与 Markdown 样式
- 首页专属样式与动效实现
- 聊天页工作台布局与消息组件
- 博客页、登录页、设置/管理页的共用组件形态

因此它描述的是“当前代码已经形成的 UI 风格”，可作为后续前端设计与实现时的统一参考。

配套的 design token 与组件样式约定见 doc/frontend_design_tokens.md。

*** Add File: d:\code\XiaoniuTech\doc\frontend_design_tokens.md
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
