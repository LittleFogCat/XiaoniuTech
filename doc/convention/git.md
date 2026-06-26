# Git 提交约定

- 提交信息使用英语，统一使用 Conventional Commits：`type(scope): summary`，其中 `scope` 可选。
- `summary` 保持简洁，直接描述本次提交的单一目的；避免使用笼统的 `update`、`fix bug` 或无上下文的中文长句。
- 常用 `type` 包括 `feat`、`fix`、`docs`、`refactor`、`chore`；只有确实跨模块或无需限定范围时才省略 `scope`。
- 当前仓库的推荐示例：`fix(frontend): prevent theme toggle remounts`、`docs: add git commit convention`。
- 当用户要求"提交"时，指的是提交+推送。仅当用户要求"提交到本地"时，才提交到本地仓库。
