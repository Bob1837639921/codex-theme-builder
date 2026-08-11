# 丹曦流羽设计 QA

## 资产

- 首页：3840 × 2160 WebP，740096 bytes。
- 对话：3840 × 2160 WebP，714972 bytes。
- 侧栏：1080 × 1920 WebP，109440 bytes。
- 用量面板：768 × 960 WebP，43060 bytes，低于 300KB 限制。
- 当前任务：640 × 72 RGBA PNG，真实透明通道。
- 输入框边缘：2048 × 384 RGBA PNG，真实透明通道。
- 文档预览：960 × 540 WebP，独立缩小，不覆盖运行时主图。
- 首页完整动效：2560 × 1440、24fps、6.75 秒、H.264/yuv420p、无音轨，6,265,181 bytes。

## 实机检查

- 1280 × 820 首页截图通过：标题、四功能区、项目选择器和输入框均在视口内，无页面横向或纵向溢出。
- 对话截图通过：正文、文件变更、进度、模型、权限、麦克风和提交/停止控件可读。
- 侧栏与正文使用连续全局画布；侧栏只叠加独立纹理与透明色，不重复裁切角色主图。
- 当前任务使用完整羽饰背景并关闭过渡，避免悬停操作挂载时边框闪烁。
- 用量、输出、插件搜索、菜单和通用弹窗均使用暖墨色语义令牌，浅色面板不继承侧栏白字。
- 动态关闭时不运行主题动画；柔和档保留低成本局部光点呼吸；完整档仅在首页播放视频，对话页不加载或解码该视频。
- 切换器测试通过：8 个主题可发现，切换、动效档位和恢复状态均成功。
- 共享 CDP 安全自检、主题载荷校验、全仓库主题验证全部通过。

## 2026-08-10 大屏高清化

- 输入母版：`work/theme-runs/new-theme-hd/source/vermilion-home.webp` 与 `vermilion-conversation.webp`，均为 3840 × 2160。
- 离线流程：本地 ComfyUI `RealESRGAN_x2plus` 超分到 7680 × 4320，再以 Lanczos 缩回 3840 × 2160；WebP quality 90 / method 6。
- 交付大小：首页 830,270 bytes；对话 774,670 bytes。
- 100% 对照检查：人物身份、脸部、冠饰、手部、服装、凤凰纹样、宫阙与文字安全区保持不变；头饰金属、发丝、刺绣和远景建筑细节更清楚，未发现锐化光环、重复纹理或构图漂移。
- 运行成本不变：仍为单张 4K 静态 WebP，无运行时滤镜、Canvas 或额外 GPU 效果。

## 2026-08-10 顶部操作栏连续性

- 保留原生 `header.app-header-tint` 的尺寸、标题、菜单、按钮、拖拽区域和交互层级。
- 将暖米白遮罩由近实色调整为 14%–22% 的渐变透明度，模糊由 14px 降至 3px。
- 同步减弱底部金线、内高光和投影，使背景图能够从菜单栏连续延伸至正文，不再形成明显横向截断。
- 1680 × 819 实机对话截图通过；标题与右侧工具按钮仍清晰，5 个顶部按钮保持可交互，无横向或纵向溢出。

final result: passed

## 2026-08-11 conversation motion video delivery

- Existing `home-motion.mp4` remains the approved home/full source.
- `conversation-motion-soft.mp4`: approved conversation/soft clip, 2,462,283 bytes.
- `conversation-motion.mp4`: approved conversation/full clip, 2,446,049 bytes.
- Both new clips were copied from the user-approved sources without recompression.
- The manifest now declares independent home/full and conversation soft/full sources; home soft remains on the static/CSS path.
- Theme validation and installed-copy hash verification passed.

## 2026-08-11 首页完整动效与交互性能

- Gemini 原片采用前向播放闭环：截取 1.333s–8.583s 的稳定区间，将末段与首段做 0.5s 交叉溶解；未使用倒放或乒乓循环。
- 输出经 Lanczos 放大到 2560 × 1440，并做保守边缘恢复；人物五官、手部、衣饰和凤凰在逐秒接触表中保持稳定。
- 视频仅绑定 `homeVideo`，只在“完整”档且首页路由中解码；“柔和”和“关闭”档不创建视频元素。
- 移除音轨并启用 fast-start；162 帧、24fps、H.264/yuv420p，低于 8MB 运行时上限。
- 输入性能修复：编辑器内部字符变更不再触发全页面主题重扫；合并窗口由 96ms 调整为 180ms；首页检测不再使用 DOM `:has()` 查询。
- 滚动性能修复：主题背景不再使用 `background-attachment: fixed`，输入框禁用实时 `backdrop-filter`，视频层固定进入独立合成层。
- 实机计算样式：对话背景为 `scroll, scroll`，输入框 `backdrop-filter: none`，对话页实时视频元素为 0。
- 编辑器突发 150 次字符 DOM 更新未增加主题重扫（同期基线 2 次，输入窗口 1 次）；600 次强制滚动布局基准为主题 15.9ms、临时关闭主题 20.9ms，未观察到主题额外滚动开销。
- 完整载荷 103,824,676 bytes，低于 CDP WebSocket 100MiB 单消息上限；首页完整档实机视频 `readyState=4`、持续播放、无溢出，柔和档无视频元素。
