# 运行时性能

本次优化不删除背景、玻璃表面、输入框装饰、选中标记、进度动效、输出面板或主题切换效果，只减少重复查找、重复写入和无效响应。

## 优化策略

- 把连续 MutationObserver 事件合并为最多每 96ms 一次的 `requestAnimationFrame` 更新。
- 忽略运行时自己写入的 class、style、data 和注入节点变更，避免观察器自激循环。
- 缓存首页、对话、侧栏、项目选择器和当前任务标记；节点仍有效时直接复用。
- 只有在相关 DOM 变更或固定低频兜底时，才扫描进度胶囊与输出面板。
- 文本和 CSS 变量只在值变化时写入，避免重复 style recalculation。
- 主题切换后原子更新资源和颜色，失败仍回滚到上一主题。
- 保留 `prefers-reduced-motion`，但默认视觉效果不因性能优化而删减。

## 同一会话测量结果

在同一台 Windows 设备、同一 Codex 对话和相同 3 秒采样窗口内，优化前后记录如下。数据用于回归判断，不代表所有设备的固定数值。

| 指标 | 优化前 | 优化后 | 变化 |
|---|---:|---:|---:|
| Task duration | 846.3 ms | 75.2 ms | -91.1% |
| Script duration | 590.4 ms | 23.5 ms | -96.0% |
| Recalculate style duration | 151.7 ms | 20.3 ms | -86.6% |
| Recalculate style count | 726 | 139 | -80.9% |
| Layout count | 6 | 0 | -100% |

额外的 2.4 秒空闲采样没有触发新的主题同步运行，说明页面静止时不会靠循环维持效果。

## 性能回归约束

共享运行时修改必须继续满足：

- MutationObserver 更新经过合并调度，不恢复整页逐 mutation 扫描。
- 当前任务标记在节点有效时不移除再插入，避免闪烁和布局抖动。
- 输出面板与进度状态只在需要时扫描，并优先复用已有标记。
- 不引入持续全屏滤镜、动态背景或会改变布局的循环动画。
- 主题 CSS 仍可完整定义视觉效果，性能策略不通过删除主题能力实现。

运行完整验证：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-repository.ps1
```
