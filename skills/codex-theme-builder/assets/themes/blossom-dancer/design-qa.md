# 绯花舞庭设计 QA

## 视觉与资源

- 首页背景：`home.webp`，3840 × 2160，714,530 bytes，高质量 WebP。
- 对话背景：`conversation.webp`，3840 × 2160，499,852 bytes，高质量 WebP。
- 首页与对话使用独立画布，舞姬固定在右侧安全区，左侧保留正文、导航和输入文字空间。
- 侧栏：`sidebar.webp`，720 × 1683，83,980 bytes；仅作为侧栏氛围纹理，不重复裁切主画布。
- 使用量面板：`usage-background.webp`，1,200 × 1,200，225,890 bytes，高质量 WebP；不复用首页或对话背景。
- 输入框前景：`composer-edge.png`，2,048 × 384，91,613 bytes；清单锚定左下，按比例渲染。
- 当前任务标记：`selected-leaf.png`，128 × 128，7,874 bytes；选中行使用明确的 1px 玫瑰粉圆角边框，不使用闪烁动画。
- 四个功能入口图标均为主题目录内的独立 SVG，未修改原生按钮结构。

## 结构与交互

- `theme.json` 使用 schema v1，并已登记到相邻 `theme-catalog.json`；主题数量不写死在切换器逻辑中。
- 主题 CSS 只在 `html.codex-dream-skin` 作用域内生效，原生输入、附件、权限、模型、麦克风、提交/停止按钮保持可交互。
- 输出栏、插件搜索、菜单、账号/用量面板和消息操作菜单统一使用暖墨文字，避免浅粉表面上的低对比文本。
- 主题切换、当前任务、文件变更摘要和弹出层沿用共享运行时的原子更新与回滚逻辑，不新增延迟图标或闪烁边框。
- 只使用局部花瓣呼吸光；`data-dream-motion="off"`、文档隐藏状态和 `prefers-reduced-motion` 均停止动效与额外层。

## 自动验证

- `inspect-theme-artwork.ps1`：通过；首页和对话均满足大屏 3840px 宽度建议，交付 WebP 仍控制在 1 MB 内。
- `test-theme.ps1`：通过；loopback CDP 验证通过，主题载荷 92,209,163 bytes（共享运行时包含全部已登记主题）。
- `runtime/v2/tests/run-tests.ps1`：通过；覆盖语法、CDP、安全边界、选中态、输入框前景、弹窗对比度、低成本细节、减少动效和零配置侵入。
- 设计预览已压缩为 `docs/images/blossom-dancer-design.webp`，1280 × 720，58,772 bytes；README 不加载原始 2 MB 截图。

## 现场复核清单

- [x] 首页 / 对话背景独立且连续，不出现人物二次裁切。
- [x] 输入框变宽、多行增高、文件变更摘要和运行中状态不拉伸前景素材。
- [x] 侧栏项目、当前任务、输出栏和用量面板在浅色表面上保持可读。
- [x] 主题切换器在窄窗口仍能显示卡片、当前状态和动态档位。
- [x] 关闭动效后不再解码或保留额外全屏动效层。

## Selected conversation strip

- Source master: `work/theme-runs/blossom-dancer/source/selected-thread-strip-master.png`
- Delivery asset: `selected-thread-strip.png`, 640 x 72, transparent PNG, 15,936 bytes
- Generated from the approved blossom palette, then chroma-keyed and assembled from the untouched master into a stretch-safe two-ended strip.
- The center remains transparent and low-detail; native title, pin, archive, hover, and focus states stay unobstructed.
- The old single-leaf delivery marker was removed rather than recompressed or retained as an unreferenced runtime asset.

## 2026-08-10 大屏高清化

- 输入母版：`work/theme-runs/new-theme-hd/source/blossom-home.webp` 与 `blossom-conversation.webp`，均为 3840 × 2160。
- 离线流程：本地 ComfyUI `RealESRGAN_x2plus` 超分到 7680 × 4320，再以 Lanczos 缩回 3840 × 2160；WebP quality 90 / method 6。
- 交付大小：首页 399,854 bytes；对话 286,386 bytes。
- 100% 对照检查：人物身份、面部、手部、舞姿、服饰、花朵、亭台和左右安全区保持不变；发丝、花饰、衣料边缘与建筑轮廓更清晰，未发现锐化光环、重复纹理或构图漂移。
- 运行成本不变：仍为单张 4K 静态 WebP，无运行时滤镜、Canvas 或额外 GPU 效果。

final result: passed
