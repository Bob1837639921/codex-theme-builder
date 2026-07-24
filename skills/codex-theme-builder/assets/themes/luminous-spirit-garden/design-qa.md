# 萤梦花庭设计 QA

## 素材

- 首页背景：`home.webp`，3840 × 2160，454180 bytes。
- 对话背景：`conversation.webp`，3840 × 2160，330274 bytes。
- 两张背景均由已批准的 1920 × 1080 原图离线等比例放大并重新编码，没有改变人物、灯笼、月亮、建筑或文本安全区。
- 独立使用量背景保持为 `usage-background.webp`，未复用首页或对话背景。

## 运行时验证

- 主题验证与仓库验证通过。
- 现场视口：1922 × 1034，未产生横向或纵向文档溢出。
- 内容头部保持 Codex 原生固定位置和高度。
- 主题切换器显示五个主题，当前主题标记完整。
- 动效强度控制显示 `关闭 / 柔和 / 完整` 三档。
- 旧版 `medium` 设置会自动迁移到 `low`；自动交互测试覆盖三档切换、主题恢复与设置持久化。
- 动效遵循 `prefers-reduced-motion`，没有连续全屏滤镜或布局动画。

## 视觉检查

- 4K 首页画面人物、发丝、灯笼轮廓与萤光点没有出现明显重影或重复纹理。
- 4K 对话画面保留中央低对比阅读区，人物仍位于右侧安全区。
- 主题切换器、输入框、侧栏和内容头部在现场截图中均未发生位置漂移。

## Random jellyfish motion QA

- `jellyfish-motion.webp` is a transparent 24-frame, 256 x 384 animated WebP (630,776 bytes) with an 8.64-second body-motion cycle.
- The runtime creates exactly three pointer-free wanderers on a full-window fixed layer.
- Each wanderer has an independent size, duration, start point, two bends, endpoint, rotation, and opacity.
- CDP sampling confirmed all three animations use `luminous-random-wander` and move independently.
- Dispatching `animationiteration` changed the motion seed and route coordinates; the keyframes reach zero opacity before reseeding.
- Each wanderer keeps its initial 60-90 second timeline while routes reseed, preventing delay/duration changes from restarting the animation and producing a visible flash.
- Routes begin near the lower viewport edge and finish above the top edge; two monotonic vertical waypoints add only restrained lateral sway, so the jellyfish always reads as rising rather than sliding sideways.
- System reduced-motion hides the entire runtime motion layer.

final result: passed
