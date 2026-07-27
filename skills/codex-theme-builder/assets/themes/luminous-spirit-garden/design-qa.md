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
- The soft motion tier reveals only the first pointer-free wanderer on a full-window fixed layer.
- The full motion tier hides the runtime jellyfish layer. On conversations it uses the enhanced background video plus its localized iridescent veil; on the home route it preserves the approved static artwork.
- Each wanderer has an independent size, duration, start point, two bends, endpoint, rotation, and opacity.
- The visible soft-tier wanderer uses `luminous-random-wander`; the remaining runtime wanderers stay hidden.
- Dispatching `animationiteration` changed the motion seed and route coordinates; the keyframes reach zero opacity before reseeding.
- Each wanderer keeps its initial 60-90 second timeline while routes reseed, preventing delay/duration changes from restarting the animation and producing a visible flash.
- Routes begin near the lower viewport edge and finish above the top edge; two monotonic vertical waypoints add only restrained lateral sway, so the jellyfish always reads as rising rather than sliding sideways.
- System reduced-motion hides the entire runtime motion layer.

final result: passed

## Home background video QA

- User-approved source: 1280 x 720, 24 fps, 10 seconds.
- The user-selected opening frame begins at 2.00 s. Cyclic-cut search compared its protected right-side character region and the full frame against the stable tail; 9.75 s was the closest accepted endpoint.
- The final 0.50 s blends the forward-moving tail into the forward 1.50-2.00 s lead-in and ends on the same pose that starts the next loop; no whole-clip ping-pong or backward playback is used.
- First-to-last-frame SSIM is approximately 0.914. Visual inspection found no face, hand, lantern, or silhouette double exposure at the wrap.
- Delivery asset: `home-motion.mp4`, H.264 High profile, yuv420p, 24 fps, 7.75 seconds, 2,946,523 bytes.
- The AAC audio track is removed and fast-start metadata is enabled.
- `homeVideo` is route-scoped to the home shell and runs only at the full motion tier.
- The conversation route continues to use `background-motion.mp4`; route changes replace the active source atomically.
- Off, soft, document-hidden, and reduced-motion states do not decode the home video.

## Background video super-resolution QA

- Source: `background-motion.mp4`, 1280 x 720, 24 fps, 9 seconds, 2,499,372 bytes.
- Processing: existing local ComfyUI 0.21.1 on RTX 4070 Ti SUPER, using the official `RealESRGAN_x2plus.pth` model.
- The 2x model output is delivered at its native enhanced size of 2560 x 1440.
- Delivery encoding: H.264 High profile, yuv420p, 24 fps, two-pass 6.8 Mbps, fast-start MP4.
- Final asset: 2560 x 1440, 9 seconds, 7,556,679 bytes, below the 8 MiB theme contract limit.
- Adjacent-frame inspection found no face, hair, lantern, or water-detail instability.
- Delivery-to-master comparison: average PSNR 46.98 dB and SSIM approximately 0.9904.
- Route scoping keeps `home.webp` on the home route and reveals the video only on populated conversations at the full motion tier.
- The superseded 720p file was replaced in place; no alternate background video remains in the theme directory.
