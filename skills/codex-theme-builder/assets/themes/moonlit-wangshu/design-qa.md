# 幽月望舒设计与实现 QA

- 主题 ID：`moonlit-wangshu`
- 对话页：以角色池头像重新锁定脸型、五官、银发和冷艳气质；人物悬立于右侧，左手托月、右手垂向冰莲，严格两臂两手，不坐姿、不铺裙。
- 首页：同一身份脸，独立月宫观星台场景、双手托冰莲姿态及月白缎面与深蓝礼服，不复用对话页构图。
- 衣料纠正：移除旧图全身菱形网格、晶片、鳞片与亮片感；改为连续深靛丝绒、月白缎面和无纹珠灰素纱，仅领口、袖口、腰线保留少量银线。
- 组件语言：月仪星图；断续刻度、单侧切角、哑光烟蓝面板，不使用流羽式完整装饰框、羽毛或圆角胶囊选中条。
- 输入框：单层深海蓝哑光表面，顶部断续校准线；无双重边框，原生按钮、模型、麦克风、停止按钮均保留。
- 任务选中与动作：恢复原版月牙、细线与右端刻度星仪条，使用浅冰蓝玻璃底和 7px 圆角裁切，中段同色连续且无深色断层；动作按钮只在正确选中项出现，hover 与选中状态稳定。
- 深色文字回归：思考耗时、时间标签、折叠推理与未标记运行命令均使用浅冰蓝语义色，实时 DOM 扫描无可见深色状态文字。
- 已覆盖：首页、对话、四功能块、项目选择器、输入框、多行/运行状态、进度条、文件变更、输出栏、菜单弹窗、插件搜索、未读标记、使用量紧凑卡和独立完整使用量背景。
- 图片：`home.webp` 与 `conversation.webp` 均为 3840×2160；`preview.webp` 为 320×180；母版仅保存在 `work/theme-runs/moonlit-wangshu/source`。
- 认证保护：沿用共享运行时登录/认证页立即卸载与登录后恢复机制。
- 动效：关闭档不创建视频；柔和与完整仅使用低成本 transform/opacity 局部效果；支持 `prefers-reduced-motion`。
- 性能：长任务流式更新不再触发完整兼容扫描；5 秒开启主题样本中 `RecalcStyleDuration=0`、运行时 `runCount` 不增长。
- 验证：主题静态验证、图片检查、CDP 资产验证、运行时回归、首页与长对话实时截图均通过。

final result: passed

## 2026-08-13 soft-motion delivery refinement

- Re-encoded `conversation-motion-soft.mp4` directly from the preserved ComfyUI 2560x1440 master; no resize, sharpening, interpolation, diffusion, or subject redraw was applied.
- Delivery remains 2560x1440, H.264/yuv420p, 24 fps, 192 frames, 8.000 s, silent, and fast-start enabled.
- Two-pass slow encode increased the delivery payload from 5,582,460 bytes to 7,432,866 bytes while remaining below the 8 MB theme limit.
- Against the 14.36 Mbps ComfyUI master, average PSNR improved from 46.61 dB to 48.55 dB and SSIM improved from 0.98787 to 0.99086.
- Visual checks at 1 s, 3 s, and 6 s preserve the face, crown, hair, hands, garment edges, moon, architecture, and water reflections without halos or composition drift.

final result: passed

## 2026-08-12 ComfyUI video clarity optimization

- Local pipeline: ComfyUI + `RealESRGAN_x2plus.pth`; every source frame was processed independently, followed by Lanczos delivery scaling. No diffusion redraw, frame interpolation, or face restoration was used.
- Home full motion: 2560x1440, H.264/yuv420p, 24 fps, 240 frames, 10.000 s, 7,441,304 bytes.
- Conversation full motion: 2560x1440, H.264/yuv420p, 24 fps, 240 frames, 10.000 s, 6,957,095 bytes.
- Conversation soft motion: 2560x1440, H.264/yuv420p, 24 fps, 192 frames, 8.000 s, 5,582,460 bytes. Soft mode reduces motion intensity only; it no longer lowers full-window playback resolution.
- Delivery encoding: single video stream, no audio, `faststart`, all files below the 8 MB per-video budget.
- Visual QA: source/output midpoint comparisons preserve identity, pose, composition, palette, and motion while improving hair, crown, garment, moonlight, and architectural edge stability.
- Original source videos are backed up outside the repository at `C:\Ai\work\moonlit-wangshu-video-upscale\source`.

final result: passed

## 2026-08-12 三档视频接入

- 架构：关闭档使用静态 4K 图；柔和档首页保持静态、对话使用 `conversation-motion-soft.mp4`；完整档首页使用 `home-motion.mp4`、对话使用 `conversation-motion.mp4`。
- 首页完整：1280×720，24 fps，10 秒，H.264，2,475,707 字节。
- 对话柔和：1280×720，24 fps，8 秒，H.264，2,025,958 字节。
- 对话完整：1280×720，24 fps，10 秒，H.264，2,507,575 字节。
- 所有视频均直接复制自用户批准的下载文件，没有二次编码或修改原始下载文件。
- 运行时验证：对话柔和与完整档均解码至 `readyState=4`、正在播放、全程仅存在一个 `.codex-dream-background-video-layer`；柔和切完整时原位替换，没有双层视频。
- 视频画布：启用主题级 `windowVideoCanvas`。首页/对话视频固定挂载到 `body` 的最底层并覆盖完整窗口，菜单条、内容标题栏、侧边栏、消息与输入框统一叠在同一动态场景之上；不再在标题栏与主内容交界处露出第二张静态裁切图。
- 验证结束后已恢复为柔和档。

final result: passed

## 2026-08-12 本地 ComfyUI 清晰度优化

- 工具：本地 ComfyUI 0.21.1，RTX 4070 Ti SUPER 16 GB。
- 模型：`RealESRGAN_x2plus.pth`；先进行 2× 内容保持型超分，再用 Lanczos 回缩至交付尺寸，未使用扩散重绘或人脸修复。
- 输入母版：优化前的 `home.webp` 与 `conversation.webp` 已保存在仓库外的 `C:\Ai\work\moonlit-wangshu-image-upscale\source`。
- 无损中间结果：ComfyUI 输出 PNG，7680×4320 经模型增强后回缩至 3840×2160。
- 交付编码：WebP quality 94 / method 6；首页 557,698 字节，对话 880,106 字节；独立 320×180 预览图 8,404 字节。
- 无损中间图到交付 WebP 的 PSNR：首页 46.32 dB，对话 44.69 dB。
- 视觉检查：人物五官、手部与构图保持不变；发丝、冠饰、月亮、衣料和暗部建筑细节更清楚；未发现明显锐化白边、光晕或重新绘制造成的形变。
- 大屏目标：两张运行时主图均保持 3840×2160，适配 4K / 超宽屏 cover 显示。

final result: passed
