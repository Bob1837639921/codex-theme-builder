((themeCatalog, initialThemeId) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const ACTIONS_ID = "codex-dream-skin-actions";
  const TITLE_ID = "codex-dream-skin-title";
  const HOME_OVERLAY_ID = "codex-dream-home-overlay";
  const SWITCHER_ID = "codex-dream-theme-switcher";
  const MOTION_LAYER_ID = "codex-dream-motion-layer";
  const BACKGROUND_VIDEO_ID = "codex-dream-background-video";
  const STORAGE_KEY = "codex-dream-theme-active";
  const MOTION_STORAGE_KEY = "codex-dream-motion-level";
  const MOTION_LEVELS = ["off", "low", "high"];
  const RUNTIME_VERSION = "2.2.0-theme-library";
  const THEME_SEARCH_THRESHOLD = 6;
  const MUTATION_COALESCE_MS = 96;
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
  previous?.restoreSidebarControls?.();
  document.getElementById(SWITCHER_ID)?.remove();
  document.getElementById(MOTION_LAYER_ID)?.remove();
  document.getElementById(BACKGROUND_VIDEO_ID)?.remove();
  for (const urls of previous?.objectUrls?.values?.() || []) {
    URL.revokeObjectURL(urls.artUrl);
    URL.revokeObjectURL(urls.conversationUrl);
    if (urls.motionUrl) URL.revokeObjectURL(urls.motionUrl);
    if (urls.usageUrl) URL.revokeObjectURL(urls.usageUrl);
    if (urls.backgroundVideoUrl) URL.revokeObjectURL(urls.backgroundVideoUrl);
  }
  const themeMap = new Map(themeCatalog.map((item) => [item.id, item]));
  if (!themeMap.size || !themeMap.has(initialThemeId)) throw new Error("Theme catalog is empty or missing the initial theme");
  const objectUrls = new Map();
  const dataUrlToObjectUrl = (dataUrl) => {
    const comma = dataUrl.indexOf(",");
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  };
  const urlsFor = (theme) => {
    if (!objectUrls.has(theme.id)) objectUrls.set(theme.id, {
      artUrl: dataUrlToObjectUrl(theme.artDataUrl),
      conversationUrl: dataUrlToObjectUrl(theme.conversationArtDataUrl),
      motionUrl: theme.motionArtDataUrl ? dataUrlToObjectUrl(theme.motionArtDataUrl) : null,
      usageUrl: theme.usageArtDataUrl ? dataUrlToObjectUrl(theme.usageArtDataUrl) : null,
      backgroundVideoUrl: null,
    });
    return objectUrls.get(theme.id);
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
    nativeHomeSuggestions: document.querySelector(".dream-native-home-suggestions"),
    conversation: document.querySelector(".dream-conversation"),
    promo: document.querySelector(".dream-home-promo"),
    projectPicker: document.querySelector(".dream-project-picker"),
    pluginSearch: document.querySelector(".dream-plugin-search"),
    pluginSearchShell: document.querySelector(".dream-plugin-search-shell"),
  };
  const detailState = {
    selectedThread: document.querySelector(".dream-selected-thread"),
    selectedLabel: document.querySelector(".dream-selected-thread-label"),
    lastProgressScan: 0,
    lastOutputScan: 0,
    progressScanRequested: true,
    outputScanRequested: true,
    usagePanel: document.querySelector(".dream-usage-panel"),
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
    restoreSidebarControls();
  };

  const markDetailSurfaces = () => {
    const diffHeaders = [...document.getElementsByClassName("group/turn-diff-header")];
    const diffCards = new Set(diffHeaders.map((header) => header.parentElement).filter(Boolean));
    document.querySelectorAll(".dream-file-changes-summary").forEach((node) => {
      if (!diffCards.has(node)) node.classList.remove("dream-file-changes-summary");
    });
    diffCards.forEach((node) => node.classList.add("dream-file-changes-summary"));

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
        const cachedSelectionIsCurrent = selected?.isConnected && sidebar.contains(selected) &&
          (!cachedTitle || !taskHeaderText || taskHeaderText.includes(cachedTitle));
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

        selected = matchingTitleRow || [...sidebar.querySelectorAll(
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
        const isDropdownSurface = node.classList?.contains("bg-token-dropdown-background") &&
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
      const outputCandidates = [...new Set(outputTexts.map(findOutputContainer).filter(Boolean))];
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
      if (!urls.backgroundVideoUrl) continue;
      URL.revokeObjectURL(urls.backgroundVideoUrl);
      urls.backgroundVideoUrl = null;
    }
  };

  const disposeBackgroundVideo = (releaseUrl = true) => {
    const video = document.getElementById(BACKGROUND_VIDEO_ID);
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    }
    if (releaseUrl) releaseBackgroundVideoUrls();
  };

  const syncBackgroundVideo = (shell = document.querySelector("main.main-surface") || document.querySelector("main")) => {
    const shouldExist = activeMotionLevel === "high" &&
      !reducedMotionQuery?.matches &&
      Boolean(activeTheme?.backgroundVideoDataUrl) &&
      Boolean(shell);
    if (!shouldExist) {
      disposeBackgroundVideo(true);
      return null;
    }

    const urls = urlsFor(activeTheme);
    if (!urls.backgroundVideoUrl) {
      urls.backgroundVideoUrl = dataUrlToObjectUrl(activeTheme.backgroundVideoDataUrl);
    }
    let video = document.getElementById(BACKGROUND_VIDEO_ID);
    if (!video || video.dataset.dreamThemeId !== activeTheme.id) {
      disposeBackgroundVideo(false);
      video = document.createElement("video");
      video.id = BACKGROUND_VIDEO_ID;
      video.dataset.dreamThemeId = activeTheme.id;
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = false;
      video.controls = false;
      video.disablePictureInPicture = true;
      video.preload = "metadata";
      video.setAttribute("aria-hidden", "true");
      video.addEventListener("canplay", () => video.classList.add("is-ready"), { once: true });
      video.src = urls.backgroundVideoUrl;
    }
    if (video.parentElement !== shell) shell.prepend(video);
    if (document.hidden) {
      video.pause();
      } else if (video.paused) {
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
    for (const item of themeCatalog) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "dream-theme-card";
      card.dataset.dreamThemeId = item.id;
      card.dataset.dreamThemeSearch = `${item.name} ${item.subtitle || ""} ${item.id}`.toLocaleLowerCase();
      const preview = document.createElement("span");
      preview.className = "dream-theme-preview";
      preview.style.backgroundImage = `url("${item.artDataUrl}")`;
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
      document.removeEventListener("pointerdown", onDocumentPointer, true);
      document.removeEventListener("keydown", onDocumentKey, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
    if (window[STATE_KEY]) window[STATE_KEY].removeSwitcherListeners = removeSwitcherListeners;
    renderSwitcherSelection();
  };

  const ensure = () => {
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const root = document.documentElement;
    if (!root) return;
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

    const shellMain = document.querySelector("main.main-surface") || document.querySelector("main");
    const home = document.querySelector('[role="main"]:has([data-testid="home-icon"])');
    syncMarker("home", home, "dream-home");
    const homeStage = home?.querySelector(":scope > div:first-child > div:first-child") ?? null;
    const homeHero = homeStage?.querySelector(":scope > div:first-child") ?? null;
    syncMarker("homeStage", homeStage, "dream-home-stage");
    syncMarker("homeHero", homeHero, "dream-home-hero");
    const nativeHomeSuggestions = home ? [...home.querySelectorAll("section")].find((node) => {
      if (node.closest(`#${HOME_OVERLAY_ID}`) || node.querySelectorAll("button").length < 4) return false;
      const rect = node.getBoundingClientRect();
      return rect.width >= 480 && rect.height >= 72 && rect.height <= 240;
    }) ?? null : null;
    syncMarker("nativeHomeSuggestions", nativeHomeSuggestions, "dream-native-home-suggestions");
    const conversation = !home ? document.querySelector('[role="main"]') : null;
    syncMarker("conversation", conversation, "dream-conversation");

    const pluginSearchInput = [...document.querySelectorAll('input[type="text"], input[type="search"]')]
      .find((input) => /(?:\u641c\u7d22\u63d2\u4ef6|search\s+plugins?)/i.test(input.placeholder || ""));
    const pluginSearch = pluginSearchInput?.parentElement ?? null;
    const pluginSearchShell = pluginSearch?.closest('[class~="sticky"]') ?? null;
    syncMarker("pluginSearch", pluginSearch, "dream-plugin-search");
    syncMarker("pluginSearchShell", pluginSearchShell, "dream-plugin-search-shell");

    if (home && (!markerState.promo?.isConnected || !home.contains(markerState.promo))) {
      const promoSeed = [...home.querySelectorAll("div, span, p")].filter((node) => {
        const value = (node.textContent || "").trim();
        return /(?:\u542f\u7528\u5feb\u901f\u6a21\u5f0f|Fast could have saved|Increases plan usage)/i.test(value) &&
          value.length < 360;
      }).sort((left, right) => {
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        return (a.width * a.height) - (b.width * b.height);
      })[0];
      let promo = promoSeed;
      while (promo && promo !== home) {
        const rect = promo.getBoundingClientRect();
        if (rect.width > 500 && rect.height > 40 && rect.height < 130 && promo.querySelectorAll("button").length >= 1) break;
        promo = promo.parentElement;
      }
      syncMarker("promo", promo && promo !== home ? promo : null, "dream-home-promo");
    }

    if (!home) {
      syncMarker("promo", null, "dream-home-promo");
    } else if (!markerState.promo?.isConnected || !home.contains(markerState.promo)) {
      const promoText = [...document.querySelectorAll("div, span, p")].find((node) => {
        const value = (node.textContent || "").trim();
        return value.startsWith("启用快速模式") && value.length < 180;
      });
      let promo = promoText;
      while (promo && promo !== home) {
        const rect = promo.getBoundingClientRect();
        if (rect.width > 500 && rect.height > 40 && rect.height < 130 && promo.querySelectorAll("button").length >= 1) {
          break;
        }
        promo = promo.parentElement;
      }
      syncMarker("promo", promo && promo !== home ? promo : null, "dream-home-promo");
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
    ensureThemeSwitcher(document.querySelector("aside.app-shell-left-panel"));
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
    document.getElementById(STYLE_ID)?.remove();
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
    document.querySelectorAll(".dream-plugin-search").forEach((node) => node.classList.remove("dream-plugin-search"));
    document.querySelectorAll(".dream-plugin-search-shell").forEach((node) => node.classList.remove("dream-plugin-search-shell"));
    clearDetailMarkers();
    const state = window[STATE_KEY];
    state?.observer?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    if (state?.scheduler?.frame) cancelAnimationFrame(state.scheduler.frame);
    for (const urls of state?.objectUrls?.values?.() || []) {
      URL.revokeObjectURL(urls.artUrl);
      URL.revokeObjectURL(urls.conversationUrl);
      if (urls.motionUrl) URL.revokeObjectURL(urls.motionUrl);
      if (urls.usageUrl) URL.revokeObjectURL(urls.usageUrl);
      if (urls.backgroundVideoUrl) URL.revokeObjectURL(urls.backgroundVideoUrl);
    }
    delete window[STATE_KEY];
    return true;
  };

  const scheduler = { frame: null, timeout: null, lastRun: 0, pending: false, runCount: 0 };
  const runtimeOwnerSelector = `#${STYLE_ID}, #${CHROME_ID}, #${HOME_OVERLAY_ID}, #${SWITCHER_ID}, #${MOTION_LAYER_ID}, #${BACKGROUND_VIDEO_ID}`;
  const isRuntimeOwnedNode = (node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.matches?.(runtimeOwnerSelector) || element?.closest?.(runtimeOwnerSelector));
  };
  const mutationIsRuntimeOwned = (mutation) => {
    if (isRuntimeOwnedNode(mutation.target)) return true;
    const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
    return changedNodes.length > 0 && changedNodes.every(isRuntimeOwnedNode);
  };
  const requestDetailScansFor = (mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        const value = (node.textContent || "").trim();
        if (!value || value.length > 4000) continue;
        if (/\u7b2c\s*\d+\s*\/\s*\d+\s*\u6b65|\d+\s*\u4e2a?\u6587\u4ef6\u5df2\u66f4/.test(value)) {
          detailState.progressScanRequested = true;
        }
        if (/(?:^|\n)(?:\u8f93\u51fa|\u73af\u5883\u4fe1\u606f|output|environment information)(?:\n|$)/i.test(value)) {
          detailState.outputScanRequested = true;
        }
      }
    }
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
    const relevantMutations = mutations.filter((mutation) => !mutationIsRuntimeOwned(mutation));
    if (relevantMutations.length) scheduleEnsure(relevantMutations);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-current", "aria-selected"],
  });
  const timer = setInterval(() => {
    detailState.progressScanRequested = true;
    detailState.outputScanRequested = true;
    scheduleEnsure();
  }, 5000);
  window[STATE_KEY] = {
    ensure,
    cleanup,
    observer,
    timer,
    scheduler,
    detailState,
    objectUrls,
    activateTheme,
    applyMotionLevel,
    removeSwitcherListeners,
    removeBackgroundVideoListeners,
    restoreSidebarControls,
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
})(__DREAM_THEME_CATALOG_JSON__, __DREAM_INITIAL_THEME_ID_JSON__)
