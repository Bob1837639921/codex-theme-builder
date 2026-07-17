((cssText, artDataUrl, conversationDataUrl, theme) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const ACTIONS_ID = "codex-dream-skin-actions";
  const TITLE_ID = "codex-dream-skin-title";
  const RUNTIME_VERSION = "2.0.0-prototype";
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
  const artUrl = previous?.artUrl || (() => {
    const comma = artDataUrl.indexOf(",");
    const binary = atob(artDataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  })();
  const conversationUrl = previous?.conversationUrl || (() => {
    const comma = conversationDataUrl.indexOf(",");
    const binary = atob(conversationDataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  })();
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.textContent = cssText;
    existingStyle.dataset.dreamVersion = RUNTIME_VERSION;
  }

  const clearDetailMarkers = () => {
    document.querySelectorAll(".dream-progress-pill").forEach((node) => node.classList.remove("dream-progress-pill"));
    document.querySelectorAll(".dream-progress-indicator").forEach((node) => node.classList.remove("dream-progress-indicator"));
    document.querySelectorAll(".dream-selected-thread").forEach((node) => node.classList.remove("dream-selected-thread"));
    document.querySelectorAll(".dream-selected-thread-label").forEach((node) => node.classList.remove("dream-selected-thread-label"));
    document.querySelectorAll(".dream-output-panel").forEach((node) => node.classList.remove("dream-output-panel"));
  };

  const markDetailSurfaces = () => {
    const progressPattern = /\u7b2c\s*\d+\s*\/\s*\d+\s*\u6b65|\d+\s*\u4e2a?\u6587\u4ef6\u5df2\u66f4/;
    let progress = document.querySelector(".dream-progress-pill");
    if (!progress?.isConnected || !progressPattern.test(progress.textContent || "")) {
      progress?.classList.remove("dream-progress-pill");
      document.querySelectorAll(".dream-progress-indicator").forEach((node) =>
        node.classList.remove("dream-progress-indicator"));
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

    const sidebar = document.querySelector("aside.app-shell-left-panel");
    if (sidebar) {
      const markedThreads = [...sidebar.querySelectorAll(".dream-selected-thread")];
      const selected = [...sidebar.querySelectorAll(
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
      markedThreads.filter((node) => node !== selected).forEach((node) =>
        node.classList.remove("dream-selected-thread"));
      selected?.classList.add("dream-selected-thread");

      const markedLabels = [...sidebar.querySelectorAll(".dream-selected-thread-label")];
      const selectedLabel = selected ? [...selected.querySelectorAll("span, p, div")].filter((node) => {
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
      markedLabels.filter((node) => node !== selectedLabel).forEach((node) =>
        node.classList.remove("dream-selected-thread-label"));
      selectedLabel?.classList.add("dream-selected-thread-label");
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
    const outputTexts = [...document.querySelectorAll("span, p, div")].filter((node) => {
        const value = (node.textContent || "").trim();
        return (value === "\u8f93\u51fa" || value === "\u73af\u5883\u4fe1\u606f" ||
          /^(?:output|environment information)$/i.test(value)) && node.children.length === 0;
      });
    const outputCandidates = [...new Set(outputTexts.map(findOutputContainer).filter(Boolean))];
    const intersectsViewport = (node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight &&
        rect.width >= 240 && rect.height >= 80 && style.display !== "none" &&
        style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0;
    };
    const output = outputCandidates.find(intersectsViewport) || outputCandidates[0] || null;
    document.querySelectorAll(".dream-output-panel").forEach((node) => {
      if (node !== output) node.classList.remove("dream-output-panel");
    });
    output?.classList.add("dream-output-panel");
  };

  const ensure = () => {
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const root = document.documentElement;
    if (!root) return;
    root.classList.add("codex-dream-skin");
    root.style.setProperty("--dream-art", `url("${artUrl}")`);
    root.style.setProperty("--dream-conversation-art", `url("${conversationUrl}")`);

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.dreamVersion !== RUNTIME_VERSION) {
      style.textContent = cssText;
      style.dataset.dreamVersion = RUNTIME_VERSION;
    }

    const shellMain = document.querySelector("main.main-surface") || document.querySelector("main");
    const home = document.querySelector('[role="main"]:has([data-testid="home-icon"])');
    for (const candidate of document.querySelectorAll('[role="main"].dream-home')) {
      if (candidate !== home) candidate.classList.remove("dream-home");
    }
    if (home) home.classList.add("dream-home");
    for (const candidate of document.querySelectorAll('[role="main"].dream-conversation')) {
      if (candidate === home) candidate.classList.remove("dream-conversation");
    }
    const conversation = !home ? document.querySelector('[role="main"]') : null;
    conversation?.classList.add("dream-conversation");

    document.querySelectorAll(".dream-home-promo").forEach((node) => node.classList.remove("dream-home-promo"));
    if (home) {
      const promoText = [...document.querySelectorAll("div, span, p")].find((node) => {
        const value = (node.textContent || "").trim();
        return value.startsWith("启用快速模式") && value.length < 180;
      });
      let promo = promoText;
      while (promo && promo !== home) {
        const rect = promo.getBoundingClientRect();
        if (rect.width > 500 && rect.height > 40 && rect.height < 130 && promo.querySelectorAll("button").length >= 1) {
          promo.classList.add("dream-home-promo");
          break;
        }
        promo = promo.parentElement;
      }
    }

    const existingActions = document.getElementById(ACTIONS_ID);
    const existingTitle = document.getElementById(TITLE_ID);
    if (!home) {
      existingActions?.remove();
      existingTitle?.remove();
    } else {
      const hero = home.querySelector(":scope > div:first-child > div:first-child > div:first-child");
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
            const icon = document.createElement("img");
            icon.src = theme.icons?.[key] || "";
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

    if (!shellMain || !document.body) return;
    shellMain.classList.toggle("dream-home-shell", Boolean(home));
    shellMain.classList.toggle("dream-conversation-shell", !home);
    markDetailSurfaces();
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
    chrome.style.pointerEvents = "none";
    chrome.querySelector(".dream-brand b").textContent = theme.name;
    chrome.querySelector(".dream-brand small").textContent = theme.subtitle;
    chrome.querySelector(".dream-signature").textContent = theme.id;
    const shellBox = shellMain.getBoundingClientRect();
    chrome.style.left = `${Math.round(shellBox.left)}px`;
    chrome.style.top = `${Math.round(shellBox.top)}px`;
    chrome.style.width = `${Math.round(shellBox.width)}px`;
    chrome.style.height = `${Math.round(shellBox.height)}px`;
    chrome.classList.toggle("dream-home-shell", Boolean(home));
  };

  const cleanup = () => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    document.documentElement?.classList.remove("codex-dream-skin");
    document.documentElement?.style.removeProperty("--dream-art");
    document.documentElement?.style.removeProperty("--dream-conversation-art");
    document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
    document.querySelectorAll(".dream-conversation").forEach((node) => node.classList.remove("dream-conversation"));
    document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
    document.querySelectorAll(".dream-conversation-shell").forEach((node) => node.classList.remove("dream-conversation-shell"));
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    document.getElementById(ACTIONS_ID)?.remove();
    document.getElementById(TITLE_ID)?.remove();
    document.querySelectorAll(".dream-home-promo").forEach((node) => node.classList.remove("dream-home-promo"));
    clearDetailMarkers();
    const state = window[STATE_KEY];
    state?.observer?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    if (state?.scheduler?.frame) cancelAnimationFrame(state.scheduler.frame);
    if (state?.artUrl) URL.revokeObjectURL(state.artUrl);
    if (state?.conversationUrl) URL.revokeObjectURL(state.conversationUrl);
    delete window[STATE_KEY];
    return true;
  };

  const scheduler = { frame: null };
  const scheduleEnsure = () => {
    if (scheduler.frame !== null) return;
    scheduler.frame = requestAnimationFrame(() => {
      scheduler.frame = null;
      ensure();
    });
  };
  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(ensure, 5000);
  window[STATE_KEY] = { ensure, cleanup, observer, timer, scheduler, artUrl, conversationUrl, version: RUNTIME_VERSION };
  ensure();
  return { installed: true, version: RUNTIME_VERSION };
})(__DREAM_CSS_JSON__, __DREAM_ART_JSON__, __DREAM_CONVERSATION_ART_JSON__, __DREAM_THEME_JSON__)
