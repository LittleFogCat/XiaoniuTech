# 股票模块开发

## 简介

开发股票模块。

## 功能描述

### 股市复盘

股市复盘包含以下内容：
- 今日热点：今日涨幅前列的板块
- 消息面：今日影响盘面的重点消息
- 关注板块：明日重点关注的板块
- 明日关注：明日重点关注的个股


### 模拟交易（待做）

模拟持仓支持进行模拟交易。
给定一个初始化的资金池，通过模拟交易进行股票的买卖、回测。

### 股票信息查询（待做）

支持通过第三方api进行股票信息，包括股价、涨跌幅等的历史数据查询。
查询到的历史数据缓存到本地数据库，历史数据优先从数据库获取。

## 数据模型

以下列出各功能所需的数据模型。
数据模型不包含一些通用元素，如：ID、创建时间、更新时间等。

### 股市复盘对象模型

#### 模型示例

```json
{
    "date": "2022-11-11",
    "topSectors": [
        {
            "name": "存储半导体",
            "changePercent": 3.5,
            "topStocks": ["600101", "000789"]
        },
        {
            "name": "CPO",
            "changePercent": 2.8,
            "topStocks": ["300113", "688781"]
        }
    ],
    "news": [
        {
            "title": "朱雀5号卫星回收失败",
            "summary": "朱雀5号卫星回收失败，二级火箭未能成功脱离，火箭返回途中坠毁",
            "detail": null,
            "source": "澎湃财经",
            "publishTime": "2025-11-11 11:11:11",
            "impactLevel": "negative",
            "impactSectors": ["商业航天", "火箭"]
        },
        {
            "title": "八部门提出到2027年我国人工智能关键核心技术实现安全可靠供给",
            "summary": "新华社北京1月7日电（记者 周圆）记者7日获悉，工业和信息化部、中央网信办、国家发展改革委等八部门日前联合印发《“人工智能+制造”专项行动实施意见》，提出到2027年，我国人工智能关键核心技术实现安全可靠供给，产业规模和赋能水平稳居世界前列。",
            "detail": null,
            "source": "新华社",
            "publishTime": "2025-11-11 10:00:00",
            "impactLevel": "positive",
            "impactSectors": ["AI算力", "服务器", "操作系统", "边缘计算", "机器人", "低空经济", "智能穿戴", "脑机接口", "智能制造"]
        }
    ],
    "focusSectors": [
        {
            "name": "脑机接口",
            "reason": "前排延续行情，后排大幅下挫，严重分化。连板封单额稳定，继续持有。"
        },
        {
            "name": "可控核聚变",
            "reason": "托卡马克装置重大突破。题材想象空间足够大，有希望走出主线，可以小仓位进入。"
        },
        {
            "name": "稀土",
            "reason": "制裁日本稀土。影响范围有限。"
        }
    ],
    "focusStoks": [
        {
            "code": "300308",
            "name": "中际旭创",
            "reason": "光模块龙头，突破前期平台"
        },
        {
            "code": "688781",
            "name": "芯海科技",
            "reason": "CPO概念，受益于云游戏的兴起。"
        }
    ]
}
```

#### 字段说明

复盘对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | 复盘日期，格式 `YYYY-MM-DD` |
| topSectors | array | 当日领涨板块列表 |
| news | array | 当日重要新闻列表 |
| focusSectors | array | 重点关注的板块及理由 |
| focusStoks | array | 重点关注的个股及理由 |

领涨板块（topSectors）：

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 板块名称 |
| changePercent | number | 板块涨幅百分比 |
| topStocks | array | 板块内领涨股代码列表 (字符串) |

重点新闻（news）：

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 新闻标题 |
| summary | string | 新闻摘要 |
| detail | null/string | 详细内容 (当前均为 null) |
| source | null/string | 新闻来源 |
| publishTime | null/string | 发布时间，格式 `YYYY-MM-DD HH:mm:ss` |
| impactLevel | string | 影响级别，`positive`\|`negative`\|`neutral` |
| impactSectors | array | 受影响的板块名称列表 |

重点关注板块（focusSectors）：

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 板块名称 |
| reason | string | 关注/持有理由 |

重点关注个股（focusStoks）：

| 字段 | 类型 | 说明 |
|------|------|------|
| code | string | 股票代码 |
| name | string | 股票名称 |
| reason | string | 关注理由 |

## API接口

以下接口：

- 股市复盘的增、删、改、查
- 股市复盘列表全量查询、分页查询和按条件查询

所有接口必须经过鉴权，权限包括：

- `stock:review:view`
- `stock:review:view_all`
- `stock:review:create`
- `stock:review:update`
- `stock:review:delete`

以上权限需要添加到权限管理中，并且初始化赋给 `owner` 用户组。

API开发规范见 [API开发规范](../apis/API开发规范.md)。

## 前端页面

### 股市复盘页面

将股市复盘对象组合成文章，以文章的形式展示在页面上。

页面路径：`/stock/review`。

主页面显示文章列表，点击文章后显示具体内容。

页面样式及风格设计见 `/doc/ui` 目录下的文档。

## 产物及验收标准

包括以下产物：

- 股市复盘模块的前端代码
- 股市复盘模块的后端代码
- 股票模块的接口文档，于 `/doc/apis/stock.md`。

验收标准：

- 前端页面正常显示，符合设计要求。
- 接口文档符合 API 文档格式。
- 所有接口正常工作，返回预期结果。
- 所有接口经过鉴权，权限管理正常。
