((baseCss, themeCatalog, initialThemeId) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const BASE_STYLE_ID = "codex-dream-skin-base-style";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const ACTIONS_ID = "codex-dream-skin-actions";
  const TITLE_ID = "codex-dream-skin-title";
  const HOME_OVERLAY_ID = "codex-dream-home-overlay";
  const SWITCHER_ID = "codex-dream-theme-switcher";
  const MOTION_LAYER_ID = "codex-dream-motion-layer";
  const BACKGROUND_VIDEO_ID = "codex-dream-background-video";
  const BACKGROUND_VIDEO_LAYER_CLASS = "codex-dream-background-video-layer";
  const VIDEO_HANDOFF_SHIELD_ID = "codex-dream-video-handoff-shield";
  const STORAGE_KEY = "codex-dream-theme-active";
  const MOTION_STORAGE_KEY = "codex-dream-motion-level";
  const MOTION_LEVELS = ["off", "low", "high"];
  const RUNTIME_VERSION = "2.3.35-low-latency-detail-scan";
  const THEME_SEARCH_THRESHOLD = 6;
  const MUTATION_COALESCE_MS = 180;
  const VIDEO_BINDING_NAME = "__CODEX_DREAM_SKIN_VIDEO__";
  const actions = [
    ["build", "构建", "编码实现与应用", "帮我构建一个新的应用"],
    ["analyze", "分析", "数据分析与洞察", "分析这个项目的结构与风险"],
    ["automate", "自动化", "智能体与工作流", "设计一个自动化工作流"],
    ["debug", "调试", "修复问题与优化", "帮我定位并修复当前问题"],
  ];
  window.__CODEX_DREAM_SKIN_DISABLED__ = false;

  const previous = window[STATE_KEY];
  if (previous?.observer) previous.observer.disconnect();
  if (previous?.timer) clearInterval(previous.timer);
  if (previous?.scheduler?.timeout) clearTimeout(previous.scheduler.timeout);
  if (previous?.scheduler?.frame) cancelAnimationFrame(previous.scheduler.frame);
  previous?.removeSwitcherListeners?.();
  previous?.removeBackgroundVideoListeners?.();
  previous?.disposeVideoHandoffShield?.();
  previous?.restoreSidebarControls?.();
  previous?.restoreCompatibilityMarkers?.();
  for (const pending of previous?.pendingVideoAssets?.values?.() || []) {
    pending.reject?.(new Error("Theme runtime replaced"));
  }
  document.getElementById(SWITCHER_ID)?.remove();
  document.getElementById(MOTION_LAYER_ID)?.remove();
  document.getElementById(VIDEO_HANDOFF_SHIELD_ID)?.remove();
  document.querySelectorAll(`#${BACKGROUND_VIDEO_ID}, .${BACKGROUND_VIDEO_LAYER_CLASS}`).forEach((video) => video.remove());
  for (const urls of previous?.objectUrls?.values?.() || []) {
    for (const url of urls.ownedUrls || []) URL.revokeObjectURL(url);
  }
  const themeMap = new Map(themeCatalog.map((item) => [item.id, item]));
  if (!themeMap.size || !themeMap.has(initialThemeId)) throw new Error("Theme catalog is empty or missing the initial theme");
  const objectUrls = new Map();
  const pendingVideoAssets = new Map();
  let nextVideoAssetRequest = 0;
  let activeBackgroundVideoElement = null;
  let themeSuspendedForNativeSurface = false;
  const usesWindowVideoCanvas = () => activeTheme?.windowVideoCanvas === true;
  const hasNativeShellHeader = (candidate) => Boolean(candidate?.querySelector(
    ':scope > header [data-testid="app-shell-header-context-menu-surface"]',
  ));
  const locateNativeShellMain = () =>
    [...document.querySelectorAll("main")].find(hasNativeShellHeader) || null;
  const ensureCompatibilityMarkers = () => {
    const shell = locateNativeShellMain();
    if (!shell) return null;
    if (!shell.classList.contains("main-surface")) {
      shell.classList.add("main-surface");
      shell.dataset.dreamCompatMainSurface = "true";
    }
    const header = shell.querySelector(":scope > header");
    if (header && !header.classList.contains("app-header-tint")) {
      header.classList.add("app-header-tint");
      header.dataset.dreamCompatHeaderTint = "true";
    }
    const composerSurfaces = new Set([
      ...document.querySelectorAll('[data-codex-composer-root] [data-composer-surface-variant]'),
      document.querySelector('[data-codex-composer="true"]')?.closest('[data-composer-surface-variant]'),
    ].filter(Boolean));
    composerSurfaces.forEach((composerSurface) => {
      if (!composerSurface.classList.contains("composer-surface-chrome")) {
        composerSurface.classList.add("composer-surface-chrome");
        composerSurface.dataset.dreamCompatComposerSurface = "true";
      }
    });
    return shell;
  };
  const restoreCompatibilityMarkers = () => {
    document.querySelectorAll('[data-dream-compat-main-surface="true"]').forEach((node) => {
      node.classList.remove("main-surface");
      delete node.dataset.dreamCompatMainSurface;
    });
    document.querySelectorAll('[data-dream-compat-header-tint="true"]').forEach((node) => {
      node.classList.remove("app-header-tint");
      delete node.dataset.dreamCompatHeaderTint;
    });
    document.querySelectorAll('[data-dream-compat-composer-surface="true"]').forEach((node) => {
      node.classList.remove("composer-surface-chrome");
      delete node.dataset.dreamCompatComposerSurface;
    });
  };
  const isNativeAppSurfaceAvailable = (
    shell = locateNativeShellMain(),
  ) => Boolean(shell && hasNativeShellHeader(shell));
  const dataUrlToObjectUrl = (dataUrl) => {
    const comma = dataUrl.indexOf(",");
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  };
  const mediaUrl = (value, ownedUrls) => {
    if (!value) return null;
    if (!value.startsWith("data:")) return value;
    const url = dataUrlToObjectUrl(value);
    ownedUrls.add(url);
    return url;
  };
  const urlsFor = (theme) => {
    if (!objectUrls.has(theme.id)) {
      const ownedUrls = new Set();
      objectUrls.set(theme.id, {
        ownedUrls,
        artUrl: mediaUrl(theme.artDataUrl, ownedUrls),
        conversationUrl: mediaUrl(theme.conversationArtDataUrl, ownedUrls),
        motionUrl: mediaUrl(theme.motionArtDataUrl, ownedUrls),
        usageUrl: mediaUrl(theme.usageArtDataUrl, ownedUrls),
        homeSoftVideoUrl: null,
        conversationSoftVideoUrl: null,
        homeVideoUrl: null,
        conversationVideoUrl: null,
      });
    }
    return objectUrls.get(theme.id);
  };
  const releaseThemeUrls = (themeId) => {
    const urls = objectUrls.get(themeId);
    if (!urls) return;
    for (const url of urls.ownedUrls || []) URL.revokeObjectURL(url);
    objectUrls.delete(themeId);
  };
  window.__CODEX_DREAM_SKIN_VIDEO_RESOLVE__ = (id, dataUrl, error) => {
    const pending = pendingVideoAssets.get(id);
    if (!pending) return;
    pendingVideoAssets.delete(id);
    if (error || !dataUrl) pending.reject(new Error(error || "Video asset was empty"));
    else pending.resolve(dataUrl);
  };
  const requestVideoDataUrl = (url) => {
    if (!url || url.startsWith("data:")) return Promise.resolve(url);
    const binding = window[VIDEO_BINDING_NAME];
    if (typeof binding !== "function") return Promise.reject(new Error("Video asset bridge is unavailable"));
    const id = `${Date.now().toString(36)}-${(++nextVideoAssetRequest).toString(36)}`;
    return new Promise((resolve, reject) => {
      pendingVideoAssets.set(id, { resolve, reject });
      try { binding(JSON.stringify({ id, url })); }
      catch (error) { pendingVideoAssets.delete(id); reject(error); }
    });
  };
  const storedThemeId = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
  const storedMotionLevel = (() => { try { return localStorage.getItem(MOTION_STORAGE_KEY); } catch { return null; } })();
  const normalizeMotionLevel = (level) => {
    if (level === "medium") return "low";
    return MOTION_LEVELS.includes(level) ? level : "low";
  };
  if (storedMotionLevel === "medium") {
    try { localStorage.setItem(MOTION_STORAGE_KEY, "low"); } catch {}
  }
  let activeTheme = themeMap.get(storedThemeId) || themeMap.get(initialThemeId);
  let activeMotionLevel = normalizeMotionLevel(storedMotionLevel);
  const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  const markerState = {
    home: document.querySelector(".dream-home"),
    homeStage: document.querySelector(".dream-home-stage"),
    homeHero: document.querySelector(".dream-home-hero"),
    nativeHomeHeading: document.querySelector(".dream-native-home-heading"),
    nativeHomeSuggestions: document.querySelector(".dream-native-home-suggestions"),
    conversation: document.querySelector(".dream-conversation"),
    promo: document.querySelector(".dream-home-promo"),
    promoHost: document.querySelector(".dream-home-promo-host"),
    projectPicker: document.querySelector(".dream-project-picker"),
    pluginSearch: document.querySelector(".dream-plugin-search"),
    pluginSearchShell: document.querySelector(".dream-plugin-search-shell"),
    sitesSurface: document.querySelector(".dream-sites-surface"),
    sitesSearch: document.querySelector(".dream-sites-search"),
    composerHost: document.querySelector(".dream-composer-host"),
    quickJumpRail: document.querySelector(".dream-quick-jump-rail"),
  };
  const detailState = {
    selectedThread: document.querySelector(".dream-selected-thread"),
    selectedLabel: document.querySelector(".dream-selected-thread-label"),
    lastProgressScan: 0,
    lastOutputScan: 0,
    progressScanRequested: true,
    outputScanRequested: true,
    stepGuideScanRequested: true,
    usagePanel: document.querySelector(".dream-usage-panel"),
    createProjectDialog: document.querySelector(".dream-create-project-dialog"),
    sitesIntroDialog: document.querySelector(".dream-sites-intro-dialog"),
    stepGuideSurfaces: new Set(document.querySelectorAll(".dream-step-guide-surface")),
    turnDurationControls: new Set(document.querySelectorAll(".dream-turn-duration")),
    conversationStatusLines: new Set(document.querySelectorAll(".dream-conversation-status-line")),
    diffActionControls: new Set(document.querySelectorAll(".dream-diff-action")),
    messageActionControls: new Set(document.querySelectorAll(".dream-message-action")),
    messageActionRows: new Set(document.querySelectorAll(".dream-message-action-row")),
    queuedMessageList: document.querySelector(".dream-queued-message-list"),
    messageEditor: document.querySelector(".dream-message-editor"),
  };
  const syncMarker = (key, node, className) => {
    const previousNode = markerState[key];
    if (previousNode === node && (!node || node.classList.contains(className))) return;
    if (previousNode && previousNode !== node) previousNode.classList.remove(className);
    if (node && !node.classList.contains(className)) node.classList.add(className);
    markerState[key] = node || null;
  };
  const setTextIfChanged = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };
  const setStyleIfChanged = (node, property, value) => {
    if (node && node.style.getPropertyValue(property) !== value) node.style.setProperty(property, value);
  };

  const restoreSidebarControl = (node) => {
    const color = node.dataset.dreamOriginalColor || "";
    const colorPriority = node.dataset.dreamOriginalColorPriority || "";
    const opacity = node.dataset.dreamOriginalOpacity || "";
    const opacityPriority = node.dataset.dreamOriginalOpacityPriority || "";
    if (color) node.style.setProperty("color", color, colorPriority);
    else node.style.removeProperty("color");
    if (opacity) node.style.setProperty("opacity", opacity, opacityPriority);
    else node.style.removeProperty("opacity");
    delete node.dataset.dreamSidebarControl;
    delete node.dataset.dreamOriginalColor;
    delete node.dataset.dreamOriginalColorPriority;
    delete node.dataset.dreamOriginalOpacity;
    delete node.dataset.dreamOriginalOpacityPriority;
  };

  const restoreSidebarControls = () => {
    document.querySelectorAll("[data-dream-sidebar-control]").forEach(restoreSidebarControl);
  };

  const clearSelectedThreadMarkers = () => {
    document.querySelectorAll(".dream-selected-thread").forEach((node) =>
      node.classList.remove("dream-selected-thread"));
    document.querySelectorAll(".dream-selected-thread-label").forEach((node) =>
      node.classList.remove("dream-selected-thread-label"));
    detailState.selectedThread = null;
    detailState.selectedLabel = null;
  };

  const clearDetailMarkers = () => {
    document.querySelectorAll(".dream-progress-pill").forEach((node) => node.classList.remove("dream-progress-pill"));
    document.querySelectorAll(".dream-progress-indicator").forEach((node) => node.classList.remove("dream-progress-indicator"));
    clearSelectedThreadMarkers();
    document.querySelectorAll(".dream-file-changes-summary").forEach((node) => node.classList.remove("dream-file-changes-summary"));
    document.querySelectorAll(".dream-output-panel").forEach((node) => node.classList.remove("dream-output-panel"));
    document.querySelectorAll(".dream-usage-panel").forEach((node) => node.classList.remove("dream-usage-panel"));
    document.querySelectorAll(".dream-create-project-dialog").forEach((node) => node.classList.remove("dream-create-project-dialog"));
    document.querySelectorAll(".dream-sites-intro-dialog").forEach((node) => node.classList.remove("dream-sites-intro-dialog"));
    document.querySelectorAll(".dream-project-name-control").forEach((node) => node.classList.remove("dream-project-name-control"));
    document.querySelectorAll(".dream-project-source-control").forEach((node) => node.classList.remove("dream-project-source-control"));
    document.querySelectorAll(".dream-step-guide-surface").forEach((node) => node.classList.remove("dream-step-guide-surface"));
    detailState.stepGuideSurfaces = new Set();
    document.querySelectorAll(".dream-turn-duration").forEach((node) => node.classList.remove("dream-turn-duration"));
    detailState.turnDurationControls = new Set();
    document.querySelectorAll(".dream-conversation-status-line").forEach((node) => node.classList.remove("dream-conversation-status-line"));
    detailState.conversationStatusLines = new Set();
    document.querySelectorAll(".dream-diff-action").forEach((node) => node.classList.remove("dream-diff-action", "dream-diff-action-undo", "dream-diff-action-review"));
    detailState.diffActionControls = new Set();
    document.querySelectorAll(".dream-message-action").forEach((node) => node.classList.remove("dream-message-action"));
    document.querySelectorAll(".dream-message-action-row").forEach((node) => node.classList.remove("dream-message-action-row"));
    detailState.messageActionControls = new Set();
    detailState.messageActionRows = new Set();
    document.querySelectorAll(".dream-queued-message-list").forEach((node) => node.classList.remove("dream-queued-message-list"));
    document.querySelectorAll(".dream-message-editor").forEach((node) => node.classList.remove("dream-message-editor"));
    detailState.queuedMessageList = null;
    detailState.messageEditor = null;
    restoreSidebarControls();
  };

  const markDetailSurfaces = () => {
    const sitesIntroPattern = /(?:\u4f7f\u7528\s*Sites\s*\u4e4b\u524d|before\s+using\s+Sites)/i;
    let sitesIntroDialog = detailState.sitesIntroDialog;
    if (!sitesIntroDialog?.isConnected || !sitesIntroDialog.classList.contains("dream-sites-intro-dialog") ||
        !sitesIntroPattern.test(sitesIntroDialog.textContent || "")) {
      sitesIntroDialog?.classList.remove("dream-sites-intro-dialog");
      sitesIntroDialog = [...document.querySelectorAll('[role="dialog"]')].find((node) =>
        sitesIntroPattern.test(node.textContent || "")) || null;
      sitesIntroDialog?.classList.add("dream-sites-intro-dialog");
      detailState.sitesIntroDialog = sitesIntroDialog;
    }

    const projectDialogPattern = /(?:\u521b\u5efa\u9879\u76ee|\u7f16\u8f91\u9879\u76ee|create\s+project|edit\s+project)/i;
    const projectNamePattern = /(?:\u9879\u76ee\u540d\u79f0|project\s+name)/i;
    const projectSourcePattern = /(?:\u9009\u62e9\u6e90\u6587\u4ef6\u5939|\u9009\u62e9\u6587\u4ef6\u5939|\u6dfb\u52a0\u6587\u4ef6\u5939|select\s+(?:a\s+)?(?:source\s+)?folder|add\s+folder)/i;
    const projectSourceLabelPattern = /^(?:\u6e90\u6587\u4ef6\u5939|\u6765\u6e90\u6587\u4ef6\u5939|source\s+folders?)$/i;
    const normalizeProjectText = (value) => `${value || ""}`.replace(/\s+/g, " ").trim();
    const findProjectNameInput = (dialog) => {
      if (!dialog) return null;
      const inputs = [...dialog.querySelectorAll('input:not([type="hidden"])')];
      return inputs.find((input) => projectNamePattern.test(
        `${input.getAttribute("aria-label") || ""} ${input.placeholder || ""}`
      )) || (projectDialogPattern.test(dialog.textContent || "") ? inputs[0] || null : null);
    };
    const findProjectSourceLabel = (dialog) => dialog ? [...dialog.querySelectorAll("label, p, span, div")].find((node) =>
      projectSourceLabelPattern.test(normalizeProjectText(node.textContent))
    ) || null : null;
    const findFollowingProjectControl = (label, dialog) => {
      let cursor = label;
      for (let depth = 0; cursor && cursor !== dialog && depth < 5; depth += 1, cursor = cursor.parentElement) {
        let sibling = cursor.nextElementSibling;
        while (sibling) {
          if (sibling.matches?.("button, [role=\"button\"]") || sibling.querySelector?.("button, [role=\"button\"]")) {
            return sibling;
          }
          sibling = sibling.nextElementSibling;
        }
      }
      return null;
    };
    let createProjectDialog = detailState.createProjectDialog;
    if (!createProjectDialog?.isConnected || !createProjectDialog.classList.contains("dream-create-project-dialog")) {
      createProjectDialog?.classList.remove("dream-create-project-dialog");
      createProjectDialog = [...document.querySelectorAll('[role="dialog"]')].find((node) => {
        const nameInput = findProjectNameInput(node);
        const sourceLabel = findProjectSourceLabel(node);
        const sourceButton = [...node.querySelectorAll("button")].find((button) =>
          projectSourcePattern.test(`${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`));
        return Boolean(nameInput && (sourceLabel || sourceButton));
      }) || null;
      createProjectDialog?.classList.add("dream-create-project-dialog");
      detailState.createProjectDialog = createProjectDialog;
    }
    const projectNameInput = findProjectNameInput(createProjectDialog);
    const projectNameControl = projectNameInput?.parentElement || null;
    const projectSourceLabel = findProjectSourceLabel(createProjectDialog);
    const projectSourceButton = createProjectDialog ? [...createProjectDialog.querySelectorAll("button")].find((button) =>
      projectSourcePattern.test(`${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`)) : null;
    const projectSourceControl = findFollowingProjectControl(projectSourceLabel, createProjectDialog) || projectSourceButton?.parentElement || null;
    document.querySelectorAll(".dream-project-name-control").forEach((node) => {
      if (node !== projectNameControl) node.classList.remove("dream-project-name-control");
    });
    document.querySelectorAll(".dream-project-source-control").forEach((node) => {
      if (node !== projectSourceControl) node.classList.remove("dream-project-source-control");
    });
    projectNameControl?.classList.add("dream-project-name-control");
    projectSourceControl?.classList.add("dream-project-source-control");

    /* Codex's transient multi-step guide keeps a native light card even when a
       dark theme owns the surrounding portal. Identify the guide by its compact
       step badge, then mark only the actually light surfaces near that badge so
       unrelated menus and dark popovers retain their own palette. */
    const stepGuidePattern = /^(?:(?:\u7b2c\s*)?\d+\s*\/\s*\d+(?:\s*\u6b65)?|step\s*\d+\s*(?:of|\/)\s*\d+)$/i;
    const parseLightSurface = (node) => {
      if (!node) return false;
      const match = getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
      if (match.length < 3 || (match.length > 3 && match[3] < .58)) return false;
      const [red, green, blue] = match;
      return ((.2126 * red) + (.7152 * green) + (.0722 * blue)) / 255 >= .68;
    };
    const nextStepGuideSurfaces = new Set(
      [...detailState.stepGuideSurfaces].filter((node) => node.isConnected)
    );
    if (detailState.stepGuideScanRequested || detailState.stepGuideSurfaces.size > nextStepGuideSurfaces.size) {
      detailState.stepGuideScanRequested = false;
      nextStepGuideSurfaces.clear();
      const stepBadge = [...document.querySelectorAll(
        '[role="status"], [class*="rounded-full"], [data-radix-popper-content-wrapper] :is(div, span, p)'
      )].find((node) => {
        const text = normalizeProjectText(node.textContent);
        if (!stepGuidePattern.test(text)) return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) || null;
      if (stepBadge) {
      const badgeRect = stepBadge.getBoundingClientRect();
      let guideRoot = stepBadge.closest("[data-radix-popper-content-wrapper]");
      if (!guideRoot) {
        let cursor = stepBadge.parentElement;
        for (let depth = 0; cursor && cursor !== document.body && depth < 6; depth += 1, cursor = cursor.parentElement) {
          const rect = cursor.getBoundingClientRect();
          if (rect.width <= 620 && rect.height <= 520 && normalizeProjectText(cursor.textContent).length > normalizeProjectText(stepBadge.textContent).length + 20) {
            guideRoot = cursor;
            break;
          }
        }
      }
      const localNodes = guideRoot ? [guideRoot, ...guideRoot.querySelectorAll("*")] : [];
      localNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width >= 120 && rect.width <= 620 && rect.height >= 24 && rect.height <= 520 && parseLightSurface(node)) {
          nextStepGuideSurfaces.add(node);
        }
      });
      let badgeSurface = stepBadge;
      for (let depth = 0; badgeSurface && badgeSurface !== document.body && depth < 5 && !parseLightSurface(badgeSurface); depth += 1) {
        badgeSurface = badgeSurface.parentElement;
      }
      if (badgeSurface && badgeSurface !== document.body && parseLightSurface(badgeSurface)) nextStepGuideSurfaces.add(badgeSurface);
      if (![...nextStepGuideSurfaces].some((node) => node.getBoundingClientRect().height > badgeRect.height + 24)) {
        const nearbyLightSurface = [...document.querySelectorAll('[class*="bg-token"], [class*="rounded-"]')]
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            const horizontalOverlap = Math.min(rect.right, badgeRect.right) - Math.max(rect.left, badgeRect.left);
            const verticalGap = badgeRect.top - rect.bottom;
            return rect.width >= 180 && rect.width <= 620 && rect.height >= 56 && rect.height <= 420 &&
              horizontalOverlap > Math.min(rect.width, badgeRect.width) * .35 && verticalGap >= -8 && verticalGap <= 72 &&
              parseLightSurface(node);
          })
          .sort((left, right) => Math.abs(badgeRect.top - left.getBoundingClientRect().bottom) - Math.abs(badgeRect.top - right.getBoundingClientRect().bottom))[0];
        if (nearbyLightSurface) nextStepGuideSurfaces.add(nearbyLightSurface);
      }
      }
    }
    detailState.stepGuideSurfaces.forEach((node) => {
      if (!nextStepGuideSurfaces.has(node)) node.classList.remove("dream-step-guide-surface");
    });
    nextStepGuideSurfaces.forEach((node) => node.classList.add("dream-step-guide-surface"));
    detailState.stepGuideSurfaces = nextStepGuideSurfaces;

    /* Current Codex renders completed-turn duration controls with text-text/60
       and text-text/40 utilities rather than the older token-text tertiary
       classes. Mark the semantic disclosure button so dark themes can provide
       one readable muted foreground without broad utility-class overrides. */
    const turnDurationPattern = /^(?:\u5df2\u5904\u7406|\u8017\u65f6|processed)\s+\d/i;
    const conversationShellForDuration = document.querySelector("main.dream-conversation-shell");
    const nextTurnDurationControls = new Set(conversationShellForDuration ?
      [...conversationShellForDuration.querySelectorAll('button[aria-expanded], span.tabular-nums')].filter((node) =>
        turnDurationPattern.test(normalizeProjectText(node.textContent))) : []);
    detailState.turnDurationControls.forEach((node) => {
      if (!nextTurnDurationControls.has(node)) node.classList.remove("dream-turn-duration");
    });
    nextTurnDurationControls.forEach((node) => node.classList.add("dream-turn-duration"));
    detailState.turnDurationControls = nextTurnDurationControls;

    /* Lifecycle copy such as stopped-turn notices, model changes, and the
       compact thinking label uses light-palette utility colors even inside a
       dark conversation. Mark the smallest stable row instead of recoloring
       every conversation descendant, which would also damage icons and light
       portaled cards. */
    const conversationLifecyclePattern = /^(?:\u4f60\u5728\s*(?:\d+\s*(?:\u5c0f\u65f6|\u5206\u949f|\u79d2)\s*)+\u540e\u505c\u6b62\u4e86|you stopped after\s*(?:\d+\s*(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\s*)+|\u6a21\u578b\u5df2\u4ece.+(?:\u66f4\u6539|\u5207\u6362)\u4e3a.+|model (?:was )?changed from.+to.+|\u6b63\u5728\u601d\u8003(?:\u2026|\.{3})?|thinking(?:\u2026|\.{3})?)$/i;
    const normalizeConversationStatusText = (node) => node?.matches?.("span.loading-shimmer-pure-text") ?
      normalizeProjectText([...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent).join(" ")) :
      normalizeProjectText(node?.textContent);
    const nextConversationStatusLines = new Set();
    if (conversationShellForDuration) {
      [...conversationShellForDuration.querySelectorAll("span, p, button, [role=status], div")]
        .filter((node) => {
          const text = normalizeConversationStatusText(node);
          if (!text || text.length > 220 || !conversationLifecyclePattern.test(text)) return false;
          return ![...node.children].some((child) => normalizeProjectText(child.textContent) === text);
        })
        .forEach((node) => {
          let row = node;
          for (let depth = 0; depth < 3 && row.parentElement && row.parentElement !== conversationShellForDuration; depth += 1) {
            const parent = row.parentElement;
            const rect = parent.getBoundingClientRect();
            if (normalizeConversationStatusText(parent) !== normalizeConversationStatusText(node) || rect.height > 52 || rect.width > 760) break;
            row = parent;
          }
          nextConversationStatusLines.add(row);
        });
    }
    detailState.conversationStatusLines.forEach((node) => {
      if (!nextConversationStatusLines.has(node)) node.classList.remove("dream-conversation-status-line");
    });
    nextConversationStatusLines.forEach((node) => node.classList.add("dream-conversation-status-line"));
    detailState.conversationStatusLines = nextConversationStatusLines;

    const messageEditorInput = document.querySelector('[role="textbox"][aria-label="编辑消息"]');
    const messageEditor = messageEditorInput?.closest("form") || null;
    if (detailState.messageEditor && detailState.messageEditor !== messageEditor) {
      detailState.messageEditor.classList.remove("dream-message-editor");
    }
    document.querySelectorAll(".dream-message-editor").forEach((node) => {
      if (node !== messageEditor) node.classList.remove("dream-message-editor");
    });
    messageEditor?.classList.add("dream-message-editor");
    detailState.messageEditor = messageEditor;

    const diffHeaders = [...document.getElementsByClassName("group/turn-diff-header")];
    const diffCards = new Set(diffHeaders.map((header) => header.parentElement).filter(Boolean));
    document.querySelectorAll(".dream-file-changes-summary").forEach((node) => {
      if (!diffCards.has(node)) node.classList.remove("dream-file-changes-summary");
    });
    diffCards.forEach((node) => node.classList.add("dream-file-changes-summary"));

    /* Diff-card actions use the native light primary-soft button token even
       when the surrounding card is a dark theme. Mark only the localized
       undo/review controls so the invisible full-row review hit target and
       file rows keep their native behavior and geometry. */
    const nextDiffActionControls = new Set();
    diffCards.forEach((card) => {
      [...card.querySelectorAll("button")].forEach((button) => {
        const label = normalizeProjectText(button.textContent || button.getAttribute("aria-label") || "");
        const action = /^(?:撤销|undo)$/i.test(label) ? "undo" : /^(?:审核|审查|review)$/i.test(label) ? "review" : "";
        if (!action) return;
        nextDiffActionControls.add(button);
        button.classList.add("dream-diff-action", `dream-diff-action-${action}`);
      });
    });
    detailState.diffActionControls.forEach((node) => {
      if (!nextDiffActionControls.has(node)) node.classList.remove("dream-diff-action", "dream-diff-action-undo", "dream-diff-action-review");
    });
    detailState.diffActionControls = nextDiffActionControls;

    /* Queued follow-up prompts are rendered above the composer as a native
       vertical-scroll-fade-mask list. Mark only the language-independent
       max-height variant owned by QueuedMessageList; its action labels are
       localized and therefore unsuitable as the primary selector. */
    const conversationShell = document.querySelector("main.dream-conversation-shell");
    const messageActionPattern = /^(?:\u590d\u5236|\u56de\u590d\u4f18\u79c0|\u56de\u590d\u4e0d\u4f73|\u4ece\u8fd9\u91cc\u521b\u5efa\u804a\u5929\u5206\u652f|\u590d\u5236\u6d88\u606f|\u7f16\u8f91\u6d88\u606f|copy|good response|bad response|branch from here|copy message|edit message)$/i;
    const nextMessageActionControls = new Set(conversationShell ? [...conversationShell.querySelectorAll("button")].filter((button) =>
      messageActionPattern.test(normalizeProjectText(button.getAttribute("aria-label") || button.title || button.textContent))) : []);
    const nextMessageActionRows = new Set();
    nextMessageActionControls.forEach((button) => {
      button.classList.add("dream-message-action");
      let row = button.parentElement;
      for (let depth = 0; row && row !== conversationShell && depth < 5; depth += 1, row = row.parentElement) {
        const rect = row.getBoundingClientRect();
        const matches = [...row.querySelectorAll("button")].filter((candidate) => nextMessageActionControls.has(candidate)).length;
        if (matches >= 2 && rect.width <= 760 && rect.height <= 56) {
          row.classList.add("dream-message-action-row");
          nextMessageActionRows.add(row);
          break;
        }
      }
    });
    detailState.messageActionControls.forEach((node) => {
      if (!nextMessageActionControls.has(node)) node.classList.remove("dream-message-action");
    });
    detailState.messageActionRows.forEach((node) => {
      if (!nextMessageActionRows.has(node)) node.classList.remove("dream-message-action-row");
    });
    detailState.messageActionControls = nextMessageActionControls;
    detailState.messageActionRows = nextMessageActionRows;
    const queuedMessageList = conversationShell ?
      [...conversationShell.querySelectorAll(".vertical-scroll-fade-mask.hide-scrollbar")].find((node) =>
        node.classList.contains("max-h-[30dvh]") &&
        node.querySelector("button") &&
        node.getBoundingClientRect().height > 0) || null : null;
    if (detailState.queuedMessageList && detailState.queuedMessageList !== queuedMessageList) {
      detailState.queuedMessageList.classList.remove("dream-queued-message-list");
    }
    document.querySelectorAll(".dream-queued-message-list").forEach((node) => {
      if (node !== queuedMessageList) node.classList.remove("dream-queued-message-list");
    });
    queuedMessageList?.classList.add("dream-queued-message-list");
    detailState.queuedMessageList = queuedMessageList;

    const progressPattern = /\u7b2c\s*\d+\s*\/\s*\d+\s*\u6b65|\d+\s*\u4e2a?\u6587\u4ef6\u5df2\u66f4/;
    let progress = document.querySelector(".dream-progress-pill");
    if (!progress?.isConnected || !progressPattern.test(progress.textContent || "")) {
      progress?.classList.remove("dream-progress-pill");
      document.querySelectorAll(".dream-progress-indicator").forEach((node) =>
        node.classList.remove("dream-progress-indicator"));
      const now = performance.now();
      if (detailState.progressScanRequested || now - detailState.lastProgressScan >= 800) {
        detailState.progressScanRequested = false;
        detailState.lastProgressScan = now;
        const progressRoot = document.querySelector("main.dream-conversation-shell .sticky.bottom-0") || document.body;
        const progressText = [...progressRoot.querySelectorAll("span, p, div")]
          .filter((node) => progressPattern.test(node.textContent || ""))
          .sort((left, right) => {
            const a = left.getBoundingClientRect();
            const b = right.getBoundingClientRect();
            return (a.width * a.height) - (b.width * b.height);
          })[0];
        progress = progressText;
        while (progress && progress !== progressRoot.parentElement) {
          const rect = progress.getBoundingClientRect();
          if (rect.width >= 150 && rect.width <= 520 && rect.height >= 28 && rect.height <= 64) {
            progress.classList.add("dream-progress-pill");
            const indicator = [...progress.querySelectorAll("svg, span, div")].find((node) => {
              const box = node.getBoundingClientRect();
              return box.width >= 10 && box.width <= 22 && box.height >= 10 && box.height <= 22 &&
                box.left < rect.left + 40;
            });
            indicator?.classList.add("dream-progress-indicator");
            break;
          }
          progress = progress.parentElement;
        }
      }
    }

    const sidebar = document.querySelector("aside.app-shell-left-panel");
    if (sidebar) {
      const sidebarControls = [...sidebar.querySelectorAll(
        'button[class*="text-token-input-placeholder-foreground"][class*="opacity-75"]'
      )];
      document.querySelectorAll("[data-dream-sidebar-control]").forEach((node) => {
        if (!sidebarControls.includes(node)) restoreSidebarControl(node);
      });
      for (const control of sidebarControls) {
        if (!control.dataset.dreamSidebarControl) {
          control.dataset.dreamSidebarControl = "true";
          control.dataset.dreamOriginalColor = control.style.getPropertyValue("color");
          control.dataset.dreamOriginalColorPriority = control.style.getPropertyPriority("color");
          control.dataset.dreamOriginalOpacity = control.style.getPropertyValue("opacity");
          control.dataset.dreamOriginalOpacityPriority = control.style.getPropertyPriority("opacity");
        }
        control.style.setProperty("color", "var(--dream-sidebar-control-text, #eef3ef)", "important");
        control.style.setProperty("opacity", ".9", "important");
      }
      const isHomeRoute = Boolean(document.querySelector("main.main-surface.dream-home-shell"));
      if (isHomeRoute) {
        clearSelectedThreadMarkers();
      } else {
        let selected = detailState.selectedThread;
        const cachedTitle = (detailState.selectedLabel?.textContent || "").trim();
        const taskHeaderText = (document.querySelector("main.main-surface > header.app-header-tint")?.textContent || "").trim();
        const nativeCurrentRow = sidebar.querySelector(
          '[aria-current="page"].sidebar-item, [aria-selected="true"].sidebar-item'
        );
        const cachedSelectionIsCurrent = selected?.isConnected && sidebar.contains(selected) &&
          (!nativeCurrentRow || nativeCurrentRow === selected) &&
          (!cachedTitle || !taskHeaderText || taskHeaderText === cachedTitle);
        if (!cachedSelectionIsCurrent) {
        const matchingTitleLabel = taskHeaderText ? [...sidebar.querySelectorAll("span, p, div")].filter((node) => {
          if (node.querySelector("button") || node.children.length > 0) return false;
          const text = (node.textContent || "").trim();
          const rect = node.getBoundingClientRect();
          return text.length >= 2 && text.length <= 80 && taskHeaderText.includes(text) &&
            rect.width >= 12 && rect.height >= 14 && rect.height <= 32;
        }).sort((left, right) => (right.textContent || "").trim().length - (left.textContent || "").trim().length)[0] : null;
        let matchingTitleRow = matchingTitleLabel;
        while (matchingTitleRow && matchingTitleRow !== sidebar) {
          const rect = matchingTitleRow.getBoundingClientRect();
          if (rect.width >= 160 && rect.width <= 320 && rect.height >= 28 && rect.height <= 64) break;
          matchingTitleRow = matchingTitleRow.parentElement;
        }
        if (matchingTitleRow === sidebar) matchingTitleRow = null;

        selected = nativeCurrentRow || matchingTitleRow || [...sidebar.querySelectorAll(
          '[aria-current="page"], [aria-selected="true"], [data-state="active"], [class~="bg-token-list-hover-background"]'
        )].filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width >= 160 && rect.height >= 28 && rect.height <= 64;
        }).sort((left, right) => {
          const a = left.getBoundingClientRect();
          const b = right.getBoundingClientRect();
          return (a.width * a.height) - (b.width * b.height);
        })[0] || [...sidebar.querySelectorAll("div, a")].filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const hasAction = node.querySelectorAll(":scope button").length >= 1;
          return hasAction && rect.width >= 160 && rect.width <= 280 && rect.height >= 28 && rect.height <= 64 &&
            style.backgroundColor !== "rgba(0, 0, 0, 0)";
        }).sort((left, right) => {
          const a = left.getBoundingClientRect();
          const b = right.getBoundingClientRect();
          return (a.width * a.height) - (b.width * b.height);
        })[0];
        if (detailState.selectedThread && detailState.selectedThread !== selected) {
          detailState.selectedThread.classList.remove("dream-selected-thread");
        }
        sidebar.querySelectorAll(".dream-selected-thread").forEach((node) => {
          if (node !== selected) node.classList.remove("dream-selected-thread");
        });
        selected?.classList.add("dream-selected-thread");
        detailState.selectedThread = selected || null;
        }

        let selectedLabel = detailState.selectedLabel;
        if (!selectedLabel?.isConnected || !selected?.contains(selectedLabel)) {
          selectedLabel = selected ? [...selected.querySelectorAll("span, p, div")].filter((node) => {
          if (node.closest("button") || node.querySelector("button")) return false;
          const directText = [...node.childNodes]
            .filter((child) => child.nodeType === Node.TEXT_NODE)
            .map((child) => child.textContent || "")
            .join("")
            .trim();
          const text = directText || (node.children.length === 0 ? (node.textContent || "").trim() : "");
          const rect = node.getBoundingClientRect();
          const row = selected.getBoundingClientRect();
          return Boolean(text) && rect.width >= 12 && rect.height >= 14 && rect.height <= 32 &&
            rect.left >= row.left && rect.right <= row.right + 1;
        }).sort((left, right) => {
          const a = left.getBoundingClientRect();
          const b = right.getBoundingClientRect();
          return a.left - b.left || a.width - b.width;
        })[0] : null;
          if (detailState.selectedLabel && detailState.selectedLabel !== selectedLabel) {
            detailState.selectedLabel.classList.remove("dream-selected-thread-label");
          }
          sidebar.querySelectorAll(".dream-selected-thread-label").forEach((node) => {
            if (node !== selectedLabel) node.classList.remove("dream-selected-thread-label");
          });
          selectedLabel?.classList.add("dream-selected-thread-label");
          detailState.selectedLabel = selectedLabel || null;
        }
      }
    }

    const findOutputContainer = (seed) => {
      let node = seed;
      let candidate = null;
      while (node && node !== document.body) {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const isDropdownSurface = (
          node.classList?.contains("bg-token-dropdown-background") ||
          node.classList?.contains("bg-surface-elevated-secondary")
        ) &&
          rect.width >= 240 && rect.width <= 560 && rect.height >= 80 && rect.height <= 720;
        if (isDropdownSurface) return node;
        const isFloatingShell = style.position === "absolute" || style.position === "fixed" ||
          style.pointerEvents === "none";
        if (!isFloatingShell && rect.width >= 240 && rect.width <= 560 &&
            rect.height >= 120 && rect.height <= 720) {
          candidate = node;
        }
        node = node.parentElement;
      }
      return candidate;
    };
    const intersectsViewport = (node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight &&
        rect.width >= 240 && rect.height >= 80 && style.display !== "none" &&
        style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0;
    };
    const markedOutput = [...document.querySelectorAll(".dream-output-panel")].find(intersectsViewport) || null;
    const now = performance.now();
    if (!markedOutput && (detailState.outputScanRequested || now - detailState.lastOutputScan >= 1000)) {
      detailState.outputScanRequested = false;
      detailState.lastOutputScan = now;
      const outputTexts = [...document.querySelectorAll("span, p, div")].filter((node) => {
          const value = (node.textContent || "").trim();
          return (value === "\u8f93\u51fa" || value === "\u73af\u5883\u4fe1\u606f" ||
            /^(?:output|environment information)$/i.test(value)) && node.children.length === 0;
        });
      const outputStructureSeeds = [...document.querySelectorAll(
        '[data-slot="thread-summary-panel-section-actions"]'
      )];
      const outputCandidates = [...new Set(
        [...outputStructureSeeds, ...outputTexts].map(findOutputContainer).filter(Boolean)
      )];
      const output = outputCandidates.find(intersectsViewport) || outputCandidates[0] || null;
      document.querySelectorAll(".dream-output-panel").forEach((node) => {
        if (node !== output) node.classList.remove("dream-output-panel");
      });
      output?.classList.add("dream-output-panel");
    }

    let usagePanel = detailState.usagePanel;
    const usagePattern = /\u4f7f\u7528\u91cf|\u6bcf\u5468\u4f7f\u7528\u9650\u989d|\u4f7f\u7528\u9650\u989d\u91cd\u7f6e|full\s+reset|usage/i;
    if (!usagePanel?.isConnected || !usagePanel.classList.contains("dream-usage-panel") ||
        usagePanel.getAttribute("role") !== "dialog" ||
        !usagePattern.test(usagePanel.textContent || "")) {
      usagePanel?.classList.remove("dream-usage-panel");
      usagePanel = [...document.querySelectorAll('[role="dialog"]')].find((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return usagePattern.test(node.textContent || "") && rect.width >= 320 && rect.height >= 360 &&
          style.display !== "none" && style.visibility !== "hidden";
      }) || null;
      usagePanel?.classList.add("dream-usage-panel");
      detailState.usagePanel = usagePanel;
    }
  };

  const renderSwitcherSelection = () => {
    const switcher = document.getElementById(SWITCHER_ID);
    switcher?.querySelectorAll("[data-dream-theme-id]").forEach((card) => {
      const selected = card.dataset.dreamThemeId === activeTheme.id;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
      const current = card.querySelector(".dream-theme-current");
      if (current) current.hidden = !selected;
    });
    switcher?.querySelectorAll("[data-dream-motion-level]").forEach((button) => {
      const selected = button.dataset.dreamMotionLevel === activeMotionLevel;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };

  const releaseBackgroundVideoUrls = () => {
    for (const urls of objectUrls.values()) {
      for (const key of ["homeSoftVideoUrl", "conversationSoftVideoUrl", "homeVideoUrl", "conversationVideoUrl"]) {
        const url = urls[key];
        if (url?.startsWith("blob:")) {
          URL.revokeObjectURL(url);
          urls.ownedUrls?.delete(url);
        }
      }
      urls.homeSoftVideoUrl = null;
      urls.conversationSoftVideoUrl = null;
      urls.homeVideoUrl = null;
      urls.conversationVideoUrl = null;
    }
  };

  const disposeVideoHandoffShield = () => {
    const shield = document.getElementById(VIDEO_HANDOFF_SHIELD_ID);
    if (!shield) return;
    if (shield._dreamSwapTimer) clearTimeout(shield._dreamSwapTimer);
    if (shield._dreamRemoveTimer) clearTimeout(shield._dreamRemoveTimer);
    shield.remove();
  };

  const ensureVideoHandoffShield = (shell, loading = false) => {
    const parent = usesWindowVideoCanvas() ? document.body : shell;
    let shield = document.getElementById(VIDEO_HANDOFF_SHIELD_ID);
    if (shield && shield.parentElement !== parent) {
      disposeVideoHandoffShield();
      shield = null;
    }
    if (!shield) {
      shield = document.createElement("div");
      shield.id = VIDEO_HANDOFF_SHIELD_ID;
      shield.setAttribute("aria-hidden", "true");
      parent.prepend(shield);
    }
    shield.classList.toggle("is-loading", loading);
    if (loading) shield.classList.add("is-opaque");
    return shield;
  };

  const disposeBackgroundVideo = (releaseUrl = true) => {
    disposeVideoHandoffShield();
    const videos = document.querySelectorAll(`#${BACKGROUND_VIDEO_ID}, .${BACKGROUND_VIDEO_LAYER_CLASS}`);
    for (const video of videos) {
      if (video._dreamCoverTimer) clearTimeout(video._dreamCoverTimer);
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    }
    activeBackgroundVideoElement = null;
    document.querySelectorAll("main.dream-video-covering").forEach((node) =>
      node.classList.remove("dream-video-covering"));
    document.documentElement?.classList.remove("dream-video-covering");
    if (releaseUrl) releaseBackgroundVideoUrls();
  };

  const suspendThemeForNativeSurface = () => {
    themeSuspendedForNativeSurface = true;
    document.documentElement?.classList.remove("codex-dream-skin", "dream-video-covering", "dream-video-window-canvas", "dream-native-surface");
    document.documentElement?.removeAttribute("data-dream-route");
    document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
    document.querySelectorAll(".dream-home-stage").forEach((node) => node.classList.remove("dream-home-stage"));
    document.querySelectorAll(".dream-home-hero").forEach((node) => node.classList.remove("dream-home-hero"));
    document.querySelectorAll(".dream-native-home-heading").forEach((node) => node.classList.remove("dream-native-home-heading"));
    document.querySelectorAll(".dream-native-home-suggestions").forEach((node) => node.classList.remove("dream-native-home-suggestions"));
    document.querySelectorAll(".dream-conversation").forEach((node) => node.classList.remove("dream-conversation"));
    document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
    document.querySelectorAll(".dream-conversation-shell").forEach((node) => node.classList.remove("dream-conversation-shell"));
    document.querySelectorAll(".dream-home-promo").forEach((node) => node.classList.remove("dream-home-promo"));
    document.querySelectorAll(".dream-home-promo-host").forEach((node) => node.classList.remove("dream-home-promo-host"));
    document.querySelectorAll(".dream-plugin-search").forEach((node) => node.classList.remove("dream-plugin-search"));
    document.querySelectorAll(".dream-plugin-search-shell").forEach((node) => node.classList.remove("dream-plugin-search-shell"));
    Object.keys(markerState).forEach((key) => { markerState[key] = null; });
    clearDetailMarkers();
    restoreSidebarControls();
    document.getElementById(CHROME_ID)?.remove();
    document.getElementById(ACTIONS_ID)?.remove();
    document.getElementById(TITLE_ID)?.remove();
    document.getElementById(HOME_OVERLAY_ID)?.remove();
    document.getElementById(SWITCHER_ID)?.remove();
    document.getElementById(MOTION_LAYER_ID)?.remove();
    removeSwitcherListeners?.();
    removeSwitcherListeners = null;
    disposeBackgroundVideo(true);
  };

  const removeOutgoingBackgroundVideos = (except = null) => {
    document.querySelectorAll(`.${BACKGROUND_VIDEO_LAYER_CLASS}.is-outgoing`).forEach((video) => {
      if (video === except) return;
      if (video._dreamCoverTimer) clearTimeout(video._dreamCoverTimer);
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    });
  };

  const revealBackgroundVideo = (video) => {
    if (document.getElementById(BACKGROUND_VIDEO_ID) !== video) return;
    const shell = document.querySelector("main.main-surface.dream-home-shell, main.main-surface.dream-conversation-shell");
    if (!shell || !isNativeAppSurfaceAvailable(shell)) return;
    const wasLoading = document.getElementById(VIDEO_HANDOFF_SHIELD_ID)?.classList.contains("is-loading") || false;
    const shield = ensureVideoHandoffShield(shell);
    shield.classList.remove("is-loading");

    const completeHandoff = () => {
      if (document.getElementById(BACKGROUND_VIDEO_ID) !== video) {
        if (shield.isConnected) shield.remove();
        return;
      }
      video.classList.add("is-handoff-swap", "is-ready", "is-covering");
      shell.classList.add("dream-video-covering");
      document.documentElement?.classList.add("dream-video-covering");
      removeOutgoingBackgroundVideos();
      /* requestAnimationFrame is suspended when Codex loses foreground focus.
         Finish the atomic shield lifecycle on a timer so CLI verification or
         an Alt-Tab during theme switching cannot strand an opaque shield. */
      shield._dreamSwapTimer = setTimeout(() => {
        if (document.getElementById(BACKGROUND_VIDEO_ID) !== video) {
          if (shield.isConnected) shield.remove();
          return;
        }
        if (!document.hidden && video.paused) video.play().catch(() => {});
        shield.classList.add("is-leaving");
        shield.classList.remove("is-opaque");
        shield._dreamRemoveTimer = setTimeout(() => {
          if (shield.isConnected) shield.remove();
          video.classList.remove("is-handoff-swap");
          if (document.hidden) video.pause();
        }, 360);
      }, 34);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (document.getElementById(BACKGROUND_VIDEO_ID) !== video) return;
        shield.classList.add("is-opaque");
        shield._dreamSwapTimer = setTimeout(completeHandoff, wasLoading ? 0 : 240);
      });
    });
  };

  const syncBackgroundVideo = (shell = document.querySelector("main.main-surface") || document.querySelector("main")) => {
    if (!isNativeAppSurfaceAvailable(shell)) {
      disposeBackgroundVideo(true);
      return null;
    }
    const sceneIsKnown = shell?.classList.contains("dream-home-shell") ||
      shell?.classList.contains("dream-conversation-shell");
    if (!sceneIsKnown) return null;
    const scene = shell?.classList.contains("dream-home-shell") ? "home" : "conversation";
    const videoTier = activeMotionLevel === "high" ? "high" :
      activeMotionLevel === "low" ? "soft" : null;
    const videoSourceUrl = videoTier === "high"
      ? (scene === "home" ? activeTheme?.homeVideoDataUrl : activeTheme?.conversationVideoDataUrl)
      : videoTier === "soft"
        ? (scene === "home" ? activeTheme?.homeSoftVideoDataUrl : activeTheme?.conversationSoftVideoDataUrl)
        : null;
    const shouldExist = Boolean(videoTier) &&
      !reducedMotionQuery?.matches &&
      Boolean(videoSourceUrl) &&
      Boolean(shell);
    if (!shouldExist) {
      disposeBackgroundVideo(true);
      return null;
    }

    const urls = urlsFor(activeTheme);
    const urlKey = videoTier === "soft"
      ? (scene === "home" ? "homeSoftVideoUrl" : "conversationSoftVideoUrl")
      : (scene === "home" ? "homeVideoUrl" : "conversationVideoUrl");
    if (!urls[urlKey]) {
      const requestKey = `${urlKey}Request`;
      if (!urls[requestKey]) {
        ensureVideoHandoffShield(shell, true);
        const requestedThemeId = activeTheme.id;
        const requestedSource = videoSourceUrl;
        urls[requestKey] = requestVideoDataUrl(requestedSource).then((dataUrl) => {
          if (!objectUrls.has(requestedThemeId)) return null;
          urls[urlKey] = mediaUrl(dataUrl, urls.ownedUrls);
          urls[requestKey] = null;
          if (activeTheme.id === requestedThemeId) syncBackgroundVideo();
          return urls[urlKey];
        }).catch((error) => {
          urls[requestKey] = null;
          if (activeTheme.id === requestedThemeId) disposeVideoHandoffShield();
          console.error("Codex theme video asset request failed", error);
          return null;
        });
      }
      return null;
    }
    let video = document.getElementById(BACKGROUND_VIDEO_ID);
    const videoParent = usesWindowVideoCanvas() ? document.body : shell;
    if (!video || video.dataset.dreamThemeId !== activeTheme.id ||
        video.dataset.dreamScene !== scene || video.dataset.dreamMotionTier !== videoTier) {
      disposeVideoHandoffShield();
      const interruptedOutgoing = document.querySelector(
        `.${BACKGROUND_VIDEO_LAYER_CLASS}.is-outgoing`,
      );
      if (video && !video.classList.contains("is-covering") && interruptedOutgoing) {
        if (video._dreamCoverTimer) clearTimeout(video._dreamCoverTimer);
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
        video = interruptedOutgoing;
      }
      removeOutgoingBackgroundVideos(video);
      if (video) {
        if (video._dreamCoverTimer) clearTimeout(video._dreamCoverTimer);
        video.removeAttribute("id");
        video.classList.remove("is-ready", "is-covering", "is-handoff-swap");
        video.classList.add(BACKGROUND_VIDEO_LAYER_CLASS, "is-outgoing");
        if (video.parentElement !== videoParent) videoParent.prepend(video);
      }
      video = document.createElement("video");
      activeBackgroundVideoElement = video;
      video.id = BACKGROUND_VIDEO_ID;
      video.dataset.dreamThemeId = activeTheme.id;
      video.dataset.dreamScene = scene;
      video.dataset.dreamMotionTier = videoTier;
      video.classList.add(
        BACKGROUND_VIDEO_LAYER_CLASS,
        scene === "home" ? "dream-home-video" : "dream-conversation-video",
      );
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = false;
      video.controls = false;
      video.disablePictureInPicture = true;
      video.preload = "auto";
      video.setAttribute("aria-hidden", "true");
      video.addEventListener("canplay", () => revealBackgroundVideo(video), { once: true });
      if (!document.querySelector(`.${BACKGROUND_VIDEO_LAYER_CLASS}.is-outgoing`)) {
        ensureVideoHandoffShield(shell, true);
      }
      video.src = urls[urlKey];
    }
    if (video.parentElement !== videoParent) videoParent.prepend(video);
    activeBackgroundVideoElement = video;
    if (document.hidden) {
      video.pause();
    } else if (video.classList.contains("is-covering") && video.paused) {
      video.play().catch(() => {});
    }
    return video;
  };

  const applyMotionLevel = (level, persist = true) => {
    const normalized = normalizeMotionLevel(level);
    activeMotionLevel = normalized;
    const root = document.documentElement;
    if (root) root.dataset.dreamMotion = normalized;
    if (persist) {
      try { localStorage.setItem(MOTION_STORAGE_KEY, normalized); } catch {}
    }
    syncBackgroundVideo();
    renderSwitcherSelection();
    return normalized;
  };

  const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const randomizeMotionWanderer = (node, index, initial = false) => {
    const width = Math.max(window.innerWidth || 1280, 640);
    const height = Math.max(window.innerHeight || 720, 480);
    const sizeRanges = [[86, 122], [66, 96], [50, 76]];
    const [minimumSize, maximumSize] = sizeRanges[index] || sizeRanges[2];
    const size = Math.round(randomBetween(minimumSize, maximumSize));
    const spriteHeight = Math.round(size * 1.5);
    const margin = Math.max(12, Math.round(size * .18));
    const minX = -Math.round(size * .18);
    const maxX = Math.max(minX + 1, width - size + Math.round(size * .18));
    const start = {
      x: Math.round(randomBetween(minX, maxX)),
      y: Math.round(height - spriteHeight * randomBetween(.06, .28)),
    };
    const maximumSideDrift = Math.min(width * .09, 150);
    const end = {
      x: clamp(
        Math.round(start.x + randomBetween(-maximumSideDrift, maximumSideDrift)),
        minX,
        maxX,
      ),
      y: -Math.round(spriteHeight * randomBetween(.48, .82)),
    };
    const verticalTravel = start.y - end.y;
    const firstSway = randomBetween(-Math.min(width * .045, 72), Math.min(width * .045, 72));
    const secondSway = randomBetween(-Math.min(width * .055, 88), Math.min(width * .055, 88));
    const one = {
      x: clamp(
        Math.round(start.x + (end.x - start.x) * .3 + firstSway),
        minX - margin,
        maxX + margin,
      ),
      y: Math.round(start.y - verticalTravel * randomBetween(.28, .34)),
    };
    const two = {
      x: clamp(
        Math.round(start.x + (end.x - start.x) * .68 + secondSway),
        minX - margin,
        maxX + margin,
      ),
      y: Math.round(start.y - verticalTravel * randomBetween(.64, .72)),
    };
    const duration = randomBetween(60, 90);
    const opacity = randomBetween(index === 0 ? .48 : .34, index === 0 ? .66 : .54);
    const rotation = () => `${Math.round(randomBetween(-8, 8))}deg`;
    const values = {
      "--dream-wander-size": `${size}px`,
      "--dream-wander-height": `${spriteHeight}px`,
      "--dream-wander-x0": `${start.x}px`,
      "--dream-wander-y0": `${start.y}px`,
      "--dream-wander-x1": `${one.x}px`,
      "--dream-wander-y1": `${one.y}px`,
      "--dream-wander-x2": `${two.x}px`,
      "--dream-wander-y2": `${two.y}px`,
      "--dream-wander-x3": `${end.x}px`,
      "--dream-wander-y3": `${end.y}px`,
      "--dream-wander-r0": rotation(),
      "--dream-wander-r1": rotation(),
      "--dream-wander-r2": rotation(),
      "--dream-wander-r3": rotation(),
      "--dream-wander-opacity": opacity.toFixed(2),
    };
    if (initial) {
      values["--dream-wander-duration"] = `${duration.toFixed(2)}s`;
      values["--dream-wander-delay"] = `${(-duration * randomBetween(.05, .76)).toFixed(2)}s`;
    }
    for (const [property, value] of Object.entries(values)) node.style.setProperty(property, value);
    node.dataset.dreamMotionSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const syncMotionLayer = (urls) => {
    document.getElementById(MOTION_LAYER_ID)?.remove();
    if (!urls.motionUrl) return;
    const layer = document.createElement("div");
    layer.id = MOTION_LAYER_ID;
    layer.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) {
      const wanderer = document.createElement("span");
      wanderer.className = "dream-motion-wanderer";
      wanderer.dataset.dreamMotionIndex = String(index);
      randomizeMotionWanderer(wanderer, index, true);
      wanderer.addEventListener("animationiteration", () => {
        randomizeMotionWanderer(wanderer, index, false);
      });
      layer.appendChild(wanderer);
    }
    document.body.appendChild(layer);
  };

  const applyTheme = (theme, persist = true) => {
    const root = document.documentElement;
    if (!root) throw new Error("Document root is unavailable");
    const urls = urlsFor(theme);
    let baseStyle = document.getElementById(BASE_STYLE_ID);
    if (!baseStyle) {
      baseStyle = document.createElement("style");
      baseStyle.id = BASE_STYLE_ID;
      (document.head || root).appendChild(baseStyle);
    }
    if (baseStyle.dataset.dreamVersion !== RUNTIME_VERSION) {
      baseStyle.textContent = baseCss;
      baseStyle.dataset.dreamVersion = RUNTIME_VERSION;
    }
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    style.textContent = theme.cssText;
    style.dataset.dreamVersion = RUNTIME_VERSION;
    style.dataset.dreamThemeId = theme.id;
    root.classList.add("codex-dream-skin");
    root.classList.add("dream-native-surface");
    root.dataset.dreamColorScheme = getComputedStyle(root).colorScheme.split(" ")[0] === "dark" ? "dark" : "light";
    root.classList.toggle("dream-video-window-canvas", theme.windowVideoCanvas === true);
    root.style.setProperty("--dream-art", `url("${urls.artUrl}")`);
    root.style.setProperty("--dream-conversation-art", `url("${urls.conversationUrl}")`);
    if (urls.motionUrl) root.style.setProperty("--dream-motion-art", `url("${urls.motionUrl}")`);
    else root.style.removeProperty("--dream-motion-art");
    root.style.setProperty("--dream-usage-art", urls.usageUrl ? `url("${urls.usageUrl}")` : "none");
    activeTheme = theme;
    syncMotionLayer(urls);
    syncBackgroundVideo();
    document.querySelectorAll(".dream-action-button[data-dream-action-key]").forEach((button) => {
      const icon = button.querySelector("img");
      if (icon) icon.src = theme.icons?.[button.dataset.dreamActionKey] || "";
    });
    const chrome = document.getElementById(CHROME_ID);
    if (chrome) {
      chrome.querySelector(".dream-brand b").textContent = theme.name;
      chrome.querySelector(".dream-brand small").textContent = theme.subtitle;
      chrome.querySelector(".dream-signature").textContent = theme.id;
    }
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme.id); } catch {}
    }
    renderSwitcherSelection();
  };

  const activateTheme = (themeId) => {
    const next = themeMap.get(themeId);
    if (!next || next === activeTheme) return true;
    const previousTheme = activeTheme;
    try {
      applyTheme(next, true);
      setTimeout(() => {
        if (activeTheme.id !== previousTheme.id) releaseThemeUrls(previousTheme.id);
      }, 1800);
      return true;
    } catch (error) {
      try { applyTheme(previousTheme, false); } catch {}
      console.error("Codex theme switch failed and was rolled back", error);
      return false;
    }
  };

  let removeSwitcherListeners = null;
  const onBackgroundVideoVisibility = () => syncBackgroundVideo();
  const onBackgroundVideoReducedMotion = () => syncBackgroundVideo();
  document.addEventListener("visibilitychange", onBackgroundVideoVisibility);
  reducedMotionQuery?.addEventListener?.("change", onBackgroundVideoReducedMotion);
  const removeBackgroundVideoListeners = () => {
    document.removeEventListener("visibilitychange", onBackgroundVideoVisibility);
    reducedMotionQuery?.removeEventListener?.("change", onBackgroundVideoReducedMotion);
  };
  const ensureThemeSwitcher = (sidebar) => {
    if (!sidebar || themeCatalog.length < 2) return;
    let switcher = document.getElementById(SWITCHER_ID);
    if (switcher?.parentElement === sidebar) {
      renderSwitcherSelection();
      return;
    }
    switcher?.remove();
    removeSwitcherListeners?.();
    switcher = document.createElement("div");
    switcher.id = SWITCHER_ID;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "dream-theme-trigger";
    trigger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
    </svg>`;
    trigger.setAttribute("aria-label", "切换主题");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.title = "切换主题";
    const panel = document.createElement("div");
    panel.className = "dream-theme-panel";
    panel.id = `${SWITCHER_ID}-panel`;
    panel.hidden = true;
    panel.setAttribute("popover", "manual");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "选择 Codex 主题");
    trigger.setAttribute("aria-controls", panel.id);
    const grid = document.createElement("div");
    grid.className = "dream-theme-grid";
    const search = document.createElement("label");
    search.className = "dream-theme-search";
    search.hidden = themeCatalog.length <= THEME_SEARCH_THRESHOLD;
    search.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>
    </svg>`;
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "搜索主题";
    searchInput.autocomplete = "off";
    searchInput.setAttribute("aria-label", "搜索主题");
    search.appendChild(searchInput);
    const empty = document.createElement("p");
    empty.className = "dream-theme-empty";
    empty.textContent = "没有匹配的主题";
    empty.hidden = true;
    const previewObserver = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const preview = entry.target;
            if (preview.dataset.dreamPreviewUrl) {
              preview.style.backgroundImage = `url("${preview.dataset.dreamPreviewUrl}")`;
              delete preview.dataset.dreamPreviewUrl;
            }
            previewObserver.unobserve(preview);
          }
        }, { root: grid, rootMargin: "80px 0px" })
      : null;
    for (const item of themeCatalog) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "dream-theme-card";
      card.dataset.dreamThemeId = item.id;
      card.dataset.dreamThemeSearch = `${item.name} ${item.subtitle || ""} ${item.id}`.toLocaleLowerCase();
      const preview = document.createElement("span");
      preview.className = "dream-theme-preview";
      preview.dataset.dreamPreviewUrl = item.previewArtDataUrl || item.artDataUrl;
      if (previewObserver) previewObserver.observe(preview);
      else preview.style.backgroundImage = `url("${preview.dataset.dreamPreviewUrl}")`;
      const current = document.createElement("span");
      current.className = "dream-theme-current";
      current.textContent = "✓";
      current.setAttribute("aria-hidden", "true");
      const label = document.createElement("strong");
      label.textContent = item.name;
      const swatches = document.createElement("span");
      swatches.className = "dream-theme-swatches";
      for (const color of item.swatches || []) {
        const swatch = document.createElement("i");
        swatch.style.backgroundColor = color;
        swatches.appendChild(swatch);
      }
      swatches.appendChild(current);
      card.append(preview, label, swatches);
      card.addEventListener("click", () => {
        activateTheme(item.id);
        close();
        trigger.focus();
      });
      grid.appendChild(card);
    }
    const filterThemes = () => {
      const query = searchInput.value.trim().toLocaleLowerCase();
      let visibleCount = 0;
      grid.querySelectorAll("[data-dream-theme-id]").forEach((card) => {
        const visible = !query || card.dataset.dreamThemeSearch.includes(query);
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      empty.hidden = visibleCount !== 0;
    };
    searchInput.addEventListener("input", filterThemes);
    panel.append(search, grid, empty);
    const motionControl = document.createElement("section");
    motionControl.className = "dream-motion-control";
    const motionHeading = document.createElement("div");
    motionHeading.className = "dream-motion-heading";
    const motionLabel = document.createElement("strong");
    motionLabel.textContent = "\u52a8\u6001\u6548\u679c";
    const motionHint = document.createElement("span");
    motionHint.textContent = "\u6c1b\u56f4\u5f3a\u5ea6";
    motionHeading.append(motionLabel, motionHint);
    const motionOptions = document.createElement("div");
    motionOptions.className = "dream-motion-options";
    motionOptions.setAttribute("role", "group");
    motionOptions.setAttribute("aria-label", "\u52a8\u6001\u6548\u679c\u5f3a\u5ea6");
    for (const [level, label] of [
      ["off", "\u5173\u95ed"],
      ["low", "\u67d4\u548c"],
      ["high", "\u5b8c\u6574"],
    ]) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "dream-motion-option";
      option.dataset.dreamMotionLevel = level;
      option.textContent = label;
      option.addEventListener("click", () => applyMotionLevel(level, true));
      motionOptions.appendChild(option);
    }
    motionControl.append(motionHeading, motionOptions);
    panel.appendChild(motionControl);
    switcher.append(trigger, panel);
    sidebar.appendChild(switcher);
    const panelIsOpen = () => panel.matches(":popover-open") || !panel.hidden;
    const positionPanel = () => {
      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.min(286, Math.max(0, window.innerWidth - 24));
      const left = Math.min(
        Math.max(12, window.innerWidth - panelWidth - 12),
        Math.max(12, rect.left - 54)
      );
      panel.style.setProperty("--dream-theme-panel-left", `${Math.round(left)}px`);
      panel.style.setProperty("--dream-theme-panel-top", `${Math.round(rect.bottom + 10)}px`);
    };
    const close = () => {
      if (panel.matches(":popover-open")) panel.hidePopover();
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (searchInput.value) {
        searchInput.value = "";
        filterThemes();
      }
    };
    const open = () => {
      positionPanel();
      panel.hidden = false;
      if (typeof panel.showPopover === "function" && !panel.matches(":popover-open")) {
        panel.showPopover();
      }
      trigger.setAttribute("aria-expanded", "true");
      const selectedCard = panel.querySelector(".is-selected");
      selectedCard?.focus({ preventScroll: true });
      selectedCard?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    const onDocumentPointer = (event) => { if (!switcher.contains(event.target)) close(); };
    const onDocumentKey = (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        close();
        trigger.focus();
      }
    };
    trigger.addEventListener("click", () => {
      if (panelIsOpen()) close();
      else open();
    });
    const onViewportChange = () => { if (panelIsOpen()) positionPanel(); };
    document.addEventListener("pointerdown", onDocumentPointer, true);
    document.addEventListener("keydown", onDocumentKey, true);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    removeSwitcherListeners = () => {
      previewObserver?.disconnect();
      document.removeEventListener("pointerdown", onDocumentPointer, true);
      document.removeEventListener("keydown", onDocumentKey, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
    if (window[STATE_KEY]) window[STATE_KEY].removeSwitcherListeners = removeSwitcherListeners;
    renderSwitcherSelection();
  };

  const locateHomePromo = (home) => {
    if (!home) return null;
    const seeds = [...home.querySelectorAll("div, span, p")].filter((node) => {
      const value = (node.textContent || "").trim();
      return /(?:\u542f\u7528\u5feb\u901f\u6a21\u5f0f|Fast could have saved|Increases plan usage)/i.test(value) &&
        value.length < 360;
    }).sort((left, right) => (left.textContent || "").length - (right.textContent || "").length);

    for (const seed of seeds) {
      const semanticCard = seed.closest("aside, [role=status]");
      if (semanticCard && home.contains(semanticCard) && semanticCard.querySelectorAll("button").length >= 1) {
        return semanticCard;
      }
      let candidate = seed;
      while (candidate && candidate !== home) {
        const rect = candidate.getBoundingClientRect();
        const naturalHeight = Math.max(rect.height, candidate.scrollHeight || 0);
        if (rect.width > 500 && naturalHeight > 40 && naturalHeight < 160 &&
            candidate.querySelectorAll("button").length >= 1) {
          return candidate;
        }
        candidate = candidate.parentElement;
      }
    }
    return null;
  };

  const ensure = () => {
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const root = document.documentElement;
    if (!root) return;
    const shellMain = ensureCompatibilityMarkers();
    const sidebar = document.querySelector("aside.app-shell-left-panel");
    if (!isNativeAppSurfaceAvailable(shellMain)) {
      suspendThemeForNativeSurface();
      return;
    }
    if (themeSuspendedForNativeSurface) {
      themeSuspendedForNativeSurface = false;
      syncMotionLayer(urlsFor(activeTheme));
    }
    root.classList.add("codex-dream-skin");
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.dreamVersion !== RUNTIME_VERSION || style.dataset.dreamThemeId !== activeTheme.id) {
      applyTheme(activeTheme, false);
      style = document.getElementById(STYLE_ID);
    }

    const homeIcon = document.querySelector('[data-testid="home-icon"]');
    const home = homeIcon?.closest('[role="main"]') ?? null;
    syncMarker("home", home, "dream-home");
    const homeStage = home?.querySelector(":scope > div:first-child > div:first-child") ?? null;
    const homeHero = homeStage?.querySelector(":scope > div:first-child") ?? null;
    syncMarker("homeStage", homeStage, "dream-home-stage");
    syncMarker("homeHero", homeHero, "dream-home-hero");
    /* Newer Codex builds expose the native Home prompt through the stable
       game-source feature marker. Themes provide their own title in the
       shared overlay, so mark only this semantic native heading and leave its
       surrounding layout intact. */
    const nativeHomeHeading = home?.querySelector('[data-feature="game-source"]') ?? null;
    syncMarker("nativeHomeHeading", nativeHomeHeading, "dream-native-home-heading");
    const nativeHomeSuggestions = home ? [...home.querySelectorAll("section")].find((node) => {
      if (node.closest(`#${HOME_OVERLAY_ID}`) || node.querySelectorAll("button").length < 4) return false;
      const rect = node.getBoundingClientRect();
      return rect.width >= 480 && rect.height >= 72 && rect.height <= 240;
    }) ?? null : null;
    syncMarker("nativeHomeSuggestions", nativeHomeSuggestions, "dream-native-home-suggestions");
    const conversation = !home ? document.querySelector('[role="main"]') : null;
    syncMarker("conversation", conversation, "dream-conversation");
    root.dataset.dreamRoute = home ? "home" : "conversation";

    /* Codex owns the quick-jump navigation and its scroll behavior. Discover it
       through the language-independent native list marker so localized aria
       labels and future copy changes cannot disable theme contrast fixes. */
    const quickJumpRail = !home ? document
      .querySelector('[data-thread-user-message-navigation-rail-list="true"]')
      ?.closest("nav") ?? null : null;
    syncMarker("quickJumpRail", quickJumpRail, "dream-quick-jump-rail");

    const composerSurface = document.querySelector(".composer-surface-chrome");
    syncMarker("composerHost", composerSurface?.parentElement ?? null, "dream-composer-host");

    const pluginSearchInput = [...document.querySelectorAll('input[type="text"], input[type="search"]')]
      .find((input) => /(?:\u641c\u7d22\u63d2\u4ef6|search\s+plugins?)/i.test(input.placeholder || ""));
    const pluginSearch = pluginSearchInput?.parentElement ?? null;
    const pluginSearchShell = pluginSearch?.closest('[class~="sticky"]') ?? null;
    syncMarker("pluginSearch", pluginSearch, "dream-plugin-search");
    syncMarker("pluginSearchShell", pluginSearchShell, "dream-plugin-search-shell");
    const sitesSearch = document.getElementById("appgen-site-search");
    const sitesSurface = sitesSearch?.closest("main.main-surface, main, [role=main]") ?? null;
    syncMarker("sitesSurface", sitesSurface, "dream-sites-surface");
    syncMarker("sitesSearch", sitesSearch?.parentElement ?? null, "dream-sites-search");

    if (!home) {
      syncMarker("promo", null, "dream-home-promo");
      syncMarker("promoHost", null, "dream-home-promo-host");
    } else {
      const promoNeedsRefresh = !markerState.promo?.isConnected ||
        !home.contains(markerState.promo) ||
        markerState.promo.tagName !== "ASIDE";
      if (promoNeedsRefresh) {
        syncMarker("promo", locateHomePromo(home), "dream-home-promo");
      }
      const promoHost = markerState.promo?.closest(".home-banners") ?? null;
      syncMarker("promoHost", promoHost && home.contains(promoHost) ? promoHost : null, "dream-home-promo-host");
    }

    const existingActions = document.getElementById(ACTIONS_ID);
    const existingTitle = document.getElementById(TITLE_ID);
    const existingHomeOverlay = document.getElementById(HOME_OVERLAY_ID);
    if (!home) {
      existingActions?.remove();
      existingTitle?.remove();
      existingHomeOverlay?.remove();
    } else {
      let hero = existingHomeOverlay;
      if (!hero || hero.parentElement !== home) {
        hero?.remove();
        hero = document.createElement("div");
        hero.id = HOME_OVERLAY_ID;
        hero.setAttribute("aria-hidden", "false");
        home.appendChild(hero);
      }
      if (hero) {
        let title = existingTitle;
        if (!title || title.parentElement !== hero) {
          title?.remove();
          title = document.createElement("div");
          title.id = TITLE_ID;
          title.className = "dream-title";
          const heading = document.createElement("h1");
          heading.textContent = "今天，想构建什么？";
          title.appendChild(heading);
          hero.appendChild(title);
        }
        let actionGrid = existingActions;
        if (!actionGrid || actionGrid.parentElement !== hero) {
          actionGrid?.remove();
          actionGrid = document.createElement("section");
          actionGrid.id = ACTIONS_ID;
          actionGrid.className = "dream-action-grid";
          actionGrid.setAttribute("aria-label", "快捷操作");
          for (const [key, title, description, prompt] of actions) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "dream-action-button";
            button.dataset.dreamActionKey = key;
            const icon = document.createElement("img");
            icon.src = activeTheme.icons?.[key] || "";
            icon.alt = "";
            icon.width = 42;
            icon.height = 42;
            const label = document.createElement("strong");
            label.textContent = title;
            const detail = document.createElement("span");
            detail.textContent = description;
            button.append(icon, label, detail);
            button.addEventListener("click", () => {
              const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
              if (!editor) return;
              editor.focus();
              editor.textContent = prompt;
              editor.dispatchEvent(new InputEvent("input", {
                bubbles: true,
                inputType: "insertText",
                data: prompt,
              }));
            });
            actionGrid.appendChild(button);
          }
          hero.appendChild(actionGrid);
        }
      }
      const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
      editor?.setAttribute("data-placeholder", "随心输入，Codex 为你构建未来");
    }

    if (!home) {
      syncMarker("projectPicker", null, "dream-project-picker");
    } else if (!markerState.projectPicker?.isConnected || !home.contains(markerState.projectPicker)) {
      const composer = document.querySelector(".composer-surface-chrome");
      const composerRect = composer?.getBoundingClientRect();
      let branch = composer;
      let projectPicker = null;
      while (branch?.parentElement && branch.parentElement !== home && composerRect) {
        const siblings = [...branch.parentElement.children];
        const branchIndex = siblings.indexOf(branch);
        const candidate = siblings.slice(0, Math.max(0, branchIndex)).reverse().find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.bottom <= composerRect.top + 4 &&
            rect.height >= 28 && rect.height <= 72 &&
            rect.width >= composerRect.width * 0.65;
        });
        if (candidate) {
          projectPicker = candidate;
          break;
        }
        branch = branch.parentElement;
      }
      syncMarker("projectPicker", projectPicker, "dream-project-picker");
    }

    if (!shellMain || !document.body) return;
    shellMain.classList.toggle("dream-home-shell", Boolean(home));
    shellMain.classList.toggle("dream-conversation-shell", !home);
    syncBackgroundVideo(shellMain);
    markDetailSurfaces();
    ensureThemeSwitcher(sidebar);
    let chrome = document.getElementById(CHROME_ID);
    if (!chrome || chrome.parentElement !== document.body) {
      chrome?.remove();
      chrome = document.createElement("div");
      chrome.id = CHROME_ID;
      chrome.setAttribute("aria-hidden", "true");
      chrome.innerHTML = `
        <div class="dream-brand"><span><b></b><small></small></span></div>
        <div class="dream-signature"></div>
        <div class="dream-sparkles"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="dream-polaroid"></div>`;
      document.body.appendChild(chrome);
    }
    setStyleIfChanged(chrome, "pointer-events", "none");
    setTextIfChanged(chrome.querySelector(".dream-brand b"), activeTheme.name);
    setTextIfChanged(chrome.querySelector(".dream-brand small"), activeTheme.subtitle);
    setTextIfChanged(chrome.querySelector(".dream-signature"), activeTheme.id);
    const shellBox = shellMain.getBoundingClientRect();
    setStyleIfChanged(chrome, "left", `${Math.round(shellBox.left)}px`);
    setStyleIfChanged(chrome, "top", `${Math.round(shellBox.top)}px`);
    setStyleIfChanged(chrome, "width", `${Math.round(shellBox.width)}px`);
    setStyleIfChanged(chrome, "height", `${Math.round(shellBox.height)}px`);
    chrome.classList.toggle("dream-home-shell", Boolean(home));
  };

  const cleanup = () => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    document.documentElement?.classList.remove("codex-dream-skin");
    document.documentElement?.removeAttribute("data-dream-motion");
    document.documentElement?.removeAttribute("data-dream-route");
    document.documentElement?.removeAttribute("data-dream-color-scheme");
    document.documentElement?.classList.remove("dream-native-surface");
    document.documentElement?.classList.remove("dream-video-window-canvas", "dream-video-covering");
    document.documentElement?.style.removeProperty("--dream-art");
    document.documentElement?.style.removeProperty("--dream-conversation-art");
    document.documentElement?.style.removeProperty("--dream-motion-art");
    document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
    document.querySelectorAll(".dream-home-stage").forEach((node) => node.classList.remove("dream-home-stage"));
    document.querySelectorAll(".dream-home-hero").forEach((node) => node.classList.remove("dream-home-hero"));
    document.querySelectorAll(".dream-native-home-suggestions").forEach((node) => node.classList.remove("dream-native-home-suggestions"));
    document.querySelectorAll(".dream-conversation").forEach((node) => node.classList.remove("dream-conversation"));
    document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
    document.querySelectorAll(".dream-conversation-shell").forEach((node) => node.classList.remove("dream-conversation-shell"));
    restoreCompatibilityMarkers();
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(BASE_STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    document.getElementById(ACTIONS_ID)?.remove();
    document.getElementById(TITLE_ID)?.remove();
    document.getElementById(HOME_OVERLAY_ID)?.remove();
    document.getElementById(SWITCHER_ID)?.remove();
    document.getElementById(MOTION_LAYER_ID)?.remove();
    disposeBackgroundVideo(true);
    removeSwitcherListeners?.();
    removeBackgroundVideoListeners();
    document.querySelectorAll(".dream-home-promo").forEach((node) => node.classList.remove("dream-home-promo"));
    document.querySelectorAll(".dream-home-promo-host").forEach((node) => node.classList.remove("dream-home-promo-host"));
    document.querySelectorAll(".dream-plugin-search").forEach((node) => node.classList.remove("dream-plugin-search"));
    document.querySelectorAll(".dream-plugin-search-shell").forEach((node) => node.classList.remove("dream-plugin-search-shell"));
    clearDetailMarkers();
    const state = window[STATE_KEY];
    state?.observer?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    if (state?.scheduler?.frame) cancelAnimationFrame(state.scheduler.frame);
    for (const urls of state?.objectUrls?.values?.() || []) {
      for (const url of urls.ownedUrls || []) URL.revokeObjectURL(url);
    }
    for (const pending of state?.pendingVideoAssets?.values?.() || []) {
      pending.reject?.(new Error("Theme runtime removed"));
    }
    pendingVideoAssets.clear();
    delete window.__CODEX_DREAM_SKIN_VIDEO_RESOLVE__;
    delete window[STATE_KEY];
    return true;
  };

  const scheduler = { frame: null, timeout: null, lastRun: 0, pending: false, runCount: 0 };
  const runtimeOwnerSelector = `#${BASE_STYLE_ID}, #${STYLE_ID}, #${CHROME_ID}, #${HOME_OVERLAY_ID}, #${SWITCHER_ID}, #${MOTION_LAYER_ID}, #${BACKGROUND_VIDEO_ID}, #${VIDEO_HANDOFF_SHIELD_ID}, .${BACKGROUND_VIDEO_LAYER_CLASS}`;
  const isRuntimeOwnedNode = (node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.matches?.(runtimeOwnerSelector) || element?.closest?.(runtimeOwnerSelector));
  };
  const mutationIsRuntimeOwned = (mutation) => {
    if (isRuntimeOwnedNode(mutation.target)) return true;
    const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
    return changedNodes.length > 0 && changedNodes.every(isRuntimeOwnedNode);
  };
  const mutationIsComposerTyping = (mutation) => {
    const element = mutation.target?.nodeType === Node.ELEMENT_NODE
      ? mutation.target
      : mutation.target?.parentElement;
    return Boolean(element?.closest?.('.ProseMirror[contenteditable="true"], textarea, input'));
  };
  const requestDetailScansFor = (mutations) => {
    let requested = false;
    let progressMissing = !document.querySelector(".dream-progress-pill");
    let outputMissing = !document.querySelector(".dream-output-panel");
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches?.('[role="dialog"], [role="status"], [data-radix-popper-content-wrapper]') ||
              node.querySelector?.('[role="dialog"], [role="status"], [data-radix-popper-content-wrapper]')) {
            detailState.stepGuideScanRequested = true;
            requested = true;
          }
          if (node.matches?.('[data-slot="thread-summary-panel-section-actions"]') ||
              node.querySelector?.('[data-slot="thread-summary-panel-section-actions"]')) {
            detailState.outputScanRequested = true;
            outputMissing = false;
            requested = true;
          }
        }
        if (!progressMissing && !outputMissing) continue;
        if (node.nodeType === Node.ELEMENT_NODE && node.childElementCount > 80) continue;
        const value = (node.textContent || "").trim();
        if (!value || value.length > 4000) continue;
        if (progressMissing &&
            /\u7b2c\s*\d+\s*\/\s*\d+\s*\u6b65|\d+\s*\u4e2a?\u6587\u4ef6\u5df2\u66f4/.test(value)) {
          detailState.progressScanRequested = true;
          progressMissing = false;
          requested = true;
        }
        if (outputMissing &&
            /(?:^|\n)(?:\u8f93\u51fa|\u73af\u5883\u4fe1\u606f|output|environment information)(?:\n|$)/i.test(value)) {
          detailState.outputScanRequested = true;
          outputMissing = false;
          requested = true;
        }
      }
    }
    return requested;
  };
  const mutationNeedsFullEnsure = (mutation) => {
    if (mutation.type === "attributes") return true;
    const target = mutation.target?.nodeType === Node.ELEMENT_NODE ? mutation.target : mutation.target?.parentElement;
    if (!target?.closest?.("main.dream-conversation-shell")) return true;
    /* Streaming long conversations can append dozens of text/tool nodes per
       second. Those additions do not change route or stable theme hosts, so a
       full compatibility scan would only force expensive style resolution.
       Still wake immediately for structural/portaled surfaces. */
    const structuralSelector = '[role="dialog"], [role="menu"], [role="main"], [data-testid="home-icon"], .composer-surface-chrome, aside.app-shell-left-panel';
    return [...mutation.addedNodes].some((node) => node.nodeType === Node.ELEMENT_NODE &&
      (node.matches?.(structuralSelector) || node.querySelector?.(structuralSelector)));
  };
  const scheduleEnsure = (mutations = []) => {
    if (mutations.length) requestDetailScansFor(mutations);
    scheduler.pending = true;
    if (scheduler.frame !== null || scheduler.timeout !== null) return;
    const elapsed = performance.now() - scheduler.lastRun;
    const delay = Math.max(0, MUTATION_COALESCE_MS - elapsed);
    const queueFrame = () => {
      scheduler.timeout = null;
      scheduler.frame = requestAnimationFrame(() => {
        scheduler.frame = null;
        scheduler.pending = false;
        scheduler.lastRun = performance.now();
        scheduler.runCount += 1;
        ensure();
      });
    };
    if (delay > 1) scheduler.timeout = setTimeout(queueFrame, delay);
    else queueFrame();
  };
  const observer = new MutationObserver((mutations) => {
    const relevantMutations = mutations.filter((mutation) =>
      !mutationIsRuntimeOwned(mutation) && !mutationIsComposerTyping(mutation));
    const detailRequested = requestDetailScansFor(relevantMutations);
    if (detailRequested || relevantMutations.some(mutationNeedsFullEnsure)) scheduleEnsure();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-current", "aria-selected"],
  });
  /* Slow reconciliation remains as a recovery path for native DOM changes
     which expose no useful mutation signal. It must not become a periodic
     full-scan tax while a large task is streaming. */
  const timer = setInterval(() => scheduleEnsure(), 30000);
  window[STATE_KEY] = {
    ensure,
    cleanup,
    observer,
    timer,
    scheduler,
    detailState,
    objectUrls,
    pendingVideoAssets,
    activateTheme,
    applyMotionLevel,
    removeSwitcherListeners,
    removeBackgroundVideoListeners,
    disposeVideoHandoffShield,
    restoreSidebarControls,
    restoreCompatibilityMarkers,
    get activeThemeId() { return activeTheme.id; },
    get activeMotionLevel() { return activeMotionLevel; },
    themeCount: themeCatalog.length,
    version: RUNTIME_VERSION,
  };
  applyMotionLevel(activeMotionLevel, false);
  applyTheme(activeTheme, false);
  ensure();
  scheduler.lastRun = performance.now();
  scheduler.runCount = 1;
  return { installed: true, version: RUNTIME_VERSION, activeThemeId: activeTheme.id, themeCount: themeCatalog.length };
})(__DREAM_BASE_CSS_JSON__, __DREAM_THEME_CATALOG_JSON__, __DREAM_INITIAL_THEME_ID_JSON__)
