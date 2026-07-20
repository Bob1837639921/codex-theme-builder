import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SKIN_VERSION = "2.1.0-prototype";
const MAX_ART_BYTES = 8 * 1024 * 1024;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const BROWSER_ID_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;

class CdpIdentityMismatchError extends Error {}

function parseArgs(argv) {
  const options = {
    port: 9335,
    mode: "watch",
    timeoutMs: 30000,
    screenshot: null,
    openHome: false,
    openSwitcher: false,
    testActions: false,
    testSwitcher: false,
    selectTheme: null,
    reload: false,
    hoverSelectedThread: false,
    browserId: null,
    themeDir: path.resolve(root, "themes", "diagnostic"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--port") options.port = Number(argv[++i]);
    else if (arg === "--once") options.mode = "once";
    else if (arg === "--watch") options.mode = "watch";
    else if (arg === "--verify") options.mode = "verify";
    else if (arg === "--remove") options.mode = "remove";
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++i]);
    else if (arg === "--browser-id") options.browserId = argv[++i];
    else if (arg === "--theme-dir") options.themeDir = path.resolve(argv[++i]);
    else if (arg === "--screenshot") options.screenshot = path.resolve(argv[++i]);
    else if (arg === "--open-home") options.openHome = true;
    else if (arg === "--open-switcher") options.openSwitcher = true;
    else if (arg === "--test-actions") options.testActions = true;
    else if (arg === "--test-switcher") options.testSwitcher = true;
    else if (arg === "--select-theme") options.selectTheme = argv[++i];
    else if (arg === "--reload") options.reload = true;
    else if (arg === "--hover-selected-thread") options.hoverSelectedThread = true;
    else if (arg === "--self-test") options.mode = "self-test";
    else if (arg === "--check-payload") options.mode = "check-payload";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 250 || options.timeoutMs > 120000) {
    throw new Error(`Invalid timeout: ${options.timeoutMs}`);
  }
  if (options.browserId !== null && !BROWSER_ID_PATTERN.test(options.browserId)) {
    throw new Error(`Invalid browser ID: ${options.browserId}`);
  }
  if (options.selectTheme !== null && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(options.selectTheme)) {
    throw new Error(`Invalid theme ID: ${options.selectTheme}`);
  }
  if (["watch", "once", "verify", "remove"].includes(options.mode) && !options.browserId) {
    throw new Error(`--browser-id is required in ${options.mode} mode`);
  }
  return options;
}

function validatedDebuggerUrl(target, port) {
  const url = new URL(target.webSocketDebuggerUrl);
  const pathIsValid = /^\/devtools\/(?:page|browser)\/[A-Za-z0-9._-]{1,200}$/.test(url.pathname);
  if (url.protocol !== "ws:" || !LOOPBACK_HOSTS.has(url.hostname) || Number(url.port) !== port ||
      url.username || url.password || url.search || url.hash || !pathIsValid) {
    throw new Error("Rejected a CDP WebSocket URL outside the allowed loopback endpoint shape");
  }
  return url.href;
}

function browserIdFromVersion(version, port) {
  const url = validatedDebuggerUrl(version, port);
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/devtools\/browser\/([A-Za-z0-9._-]{1,200})$/);
  if (!match || parsed.search || parsed.hash || !BROWSER_ID_PATTERN.test(match[1])) {
    throw new Error("Rejected an invalid CDP browser identity URL");
  }
  return match[1];
}

function isValidCdpPageTarget(item, port) {
  if (item?.type !== "page" || !item.url?.startsWith("app://") || typeof item.id !== "string" ||
      !BROWSER_ID_PATTERN.test(item.id) || !item.webSocketDebuggerUrl) return false;
  try {
    const debuggerUrl = new URL(validatedDebuggerUrl(item, port));
    return debuggerUrl.pathname === `/devtools/page/${item.id}`;
  } catch {
    return false;
  }
}

class CdpSession {
  constructor(target, port) {
    this.target = target;
    this.ws = new WebSocket(validatedDebuggerUrl(target, port));
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;
  }

  async open() {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { this.ws.close(); } catch {}
        reject(new Error("CDP WebSocket open timed out"));
      }, 5000);
      this.ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("CDP WebSocket open failed")); }, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.onMessage(event));
    this.ws.addEventListener("error", () => this.close());
    this.ws.addEventListener("close", () => {
      this.closed = true;
      for (const waiter of this.pending.values()) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error("CDP socket closed"));
      }
      this.pending.clear();
    });
    await this.send("Runtime.enable");
    await this.send("Page.enable");
    return this;
  }

  onMessage(event) {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      this.close();
      return;
    }
    if (message.id) {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      clearTimeout(waiter.timeout);
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`${message.error.message} (${message.error.code})`));
      else waiter.resolve(message.result);
      return;
    }
    for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    if (this.closed) return Promise.reject(new Error("CDP session is closed"));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 10000);
      this.pending.set(id, { resolve, reject, timeout });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
      throw new Error(`Renderer evaluation failed: ${detail}`);
    }
    return result.result?.value;
  }

  close() {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error("CDP session closed"));
    }
    this.pending.clear();
    if (!this.closed) {
      try { this.ws.close(); } catch {}
    }
    this.closed = true;
  }
}

class BrowserIdentityAnchor {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.closed = false;
    this.ws.addEventListener("close", () => { this.closed = true; });
    this.ws.addEventListener("error", () => {
      this.closed = true;
      try { this.ws.close(); } catch {}
    });
  }

  async open() {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.close();
        reject(new Error("CDP browser identity WebSocket open timed out"));
      }, 5000);
      this.ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("CDP browser identity WebSocket open failed"));
      }, { once: true });
      this.ws.addEventListener("close", () => {
        clearTimeout(timeout);
        reject(new Error("CDP browser identity WebSocket closed during startup"));
      }, { once: true });
    });
    if (this.closed) throw new Error("CDP browser identity WebSocket is already closed");
    return this;
  }

  close() {
    if (!this.closed) {
      try { this.ws.close(); } catch {}
    }
    this.closed = true;
  }
}

async function fetchCdpJson(port, resource) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`http://127.0.0.1:${port}${resource}`, {
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function listAppTargets(port, expectedBrowserId = null) {
  const targets = await fetchCdpJson(port, "/json/list");
  if (!Array.isArray(targets)) throw new Error("CDP target list is not an array");
  if (expectedBrowserId) {
    const version = await fetchCdpJson(port, "/json/version");
    const actualBrowserId = browserIdFromVersion(version, port);
    if (actualBrowserId !== expectedBrowserId) {
      throw new CdpIdentityMismatchError(
        `CDP browser identity changed from ${expectedBrowserId} to ${actualBrowserId}`,
      );
    }
  }
  return targets.filter((item) => isValidCdpPageTarget(item, port));
}

async function connectBrowserIdentityAnchor(port, expectedBrowserId) {
  const version = await fetchCdpJson(port, "/json/version");
  const actualBrowserId = browserIdFromVersion(version, port);
  if (actualBrowserId !== expectedBrowserId) {
    throw new CdpIdentityMismatchError(
      `CDP browser identity changed from ${expectedBrowserId} to ${actualBrowserId}`,
    );
  }
  return new BrowserIdentityAnchor(validatedDebuggerUrl(version, port)).open();
}

async function loadThemePackage(themeDir, baseCss) {
  const manifestPath = path.join(themeDir, "theme.json");
  const [manifestText, themeCss] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    fs.readFile(path.join(themeDir, "theme.css"), "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    }),
  ]);
  const raw = JSON.parse(manifestText);
  if (raw.schemaVersion !== 1 || typeof raw.name !== "string" || !raw.name.trim()) {
    throw new Error("Theme manifest must use schemaVersion 1 and include a name");
  }
  const color = (value, fallback) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value : fallback;
  const text = (value, fallback, max = 100) => typeof value === "string" && value.trim()
    ? value.trim().slice(0, max) : fallback;
  const image = raw.image ?? "background.png";
  if (path.basename(image) !== image || !/\.(?:png|jpe?g|webp)$/i.test(image)) {
    throw new Error("Theme image must be a PNG, JPEG, or WebP file inside the theme directory");
  }
  const imagePath = path.join(themeDir, image);
  const stat = await fs.stat(imagePath);
  if (!stat.isFile() || stat.size < 1 || stat.size > MAX_ART_BYTES) {
    throw new Error("Theme image must be non-empty and no larger than 8 MB");
  }
  const conversationImage = raw.conversationImage ?? image;
  if (path.basename(conversationImage) !== conversationImage || !/\.(?:png|jpe?g|webp)$/i.test(conversationImage)) {
    throw new Error("Conversation image must be a PNG, JPEG, or WebP file inside the theme directory");
  }
  const conversationImagePath = path.join(themeDir, conversationImage);
  const conversationStat = await fs.stat(conversationImagePath);
  if (!conversationStat.isFile() || conversationStat.size < 1 || conversationStat.size > MAX_ART_BYTES) {
    throw new Error("Conversation image must be non-empty and no larger than 8 MB");
  }
  let sidebarImageDataUrl = "none";
  if (raw.sidebarImage !== undefined) {
    if (typeof raw.sidebarImage !== "string" || path.basename(raw.sidebarImage) !== raw.sidebarImage ||
        !/\.(?:png|jpe?g|webp)$/i.test(raw.sidebarImage)) {
      throw new Error("Sidebar image must be a PNG, JPEG, or WebP file inside the theme directory");
    }
    const sidebarImagePath = path.join(themeDir, raw.sidebarImage);
    const sidebarImageStat = await fs.stat(sidebarImagePath);
    if (!sidebarImageStat.isFile() || sidebarImageStat.size < 1 || sidebarImageStat.size > MAX_ART_BYTES) {
      throw new Error("Sidebar image must be non-empty and no larger than 8 MB");
    }
    const sidebarImageBytes = await fs.readFile(sidebarImagePath);
    const sidebarExtension = path.extname(raw.sidebarImage).toLowerCase();
    const sidebarMime = sidebarExtension === ".webp" ? "image/webp" :
      sidebarExtension === ".jpg" || sidebarExtension === ".jpeg" ? "image/jpeg" : "image/png";
    sidebarImageDataUrl = `url("data:${sidebarMime};base64,${sidebarImageBytes.toString("base64")}")`;
  }
  let selectedLeafDataUrl = "none";
  if (raw.selectedLeaf !== undefined) {
    if (typeof raw.selectedLeaf !== "string" || path.basename(raw.selectedLeaf) !== raw.selectedLeaf ||
        !/\.(?:png|webp)$/i.test(raw.selectedLeaf)) {
      throw new Error("Selected leaf must be a PNG or WebP file inside the theme directory");
    }
    const selectedLeafPath = path.join(themeDir, raw.selectedLeaf);
    const selectedLeafStat = await fs.stat(selectedLeafPath);
    if (!selectedLeafStat.isFile() || selectedLeafStat.size < 1 || selectedLeafStat.size > 512 * 1024) {
      throw new Error("Selected leaf must be non-empty and no larger than 512 KB");
    }
    const selectedLeafBytes = await fs.readFile(selectedLeafPath);
    const selectedLeafMime = path.extname(raw.selectedLeaf).toLowerCase() === ".webp" ? "image/webp" : "image/png";
    selectedLeafDataUrl = `url("data:${selectedLeafMime};base64,${selectedLeafBytes.toString("base64")}")`;
  }
  let composerEdgeDataUrl = "none";
  let composerEdgePosition = "left bottom";
  let composerEdgeMaxHeight = 128;
  let composerEdgeOpacity = 0.84;
  if (raw.composerEdge !== undefined) {
    const composerEdge = typeof raw.composerEdge === "string"
      ? { image: raw.composerEdge }
      : raw.composerEdge;
    if (!composerEdge || typeof composerEdge !== "object" || typeof composerEdge.image !== "string" ||
        path.basename(composerEdge.image) !== composerEdge.image || !/\.(?:png|webp)$/i.test(composerEdge.image)) {
      throw new Error("Composer edge must be a PNG or WebP file inside the theme directory");
    }
    const composerEdgePath = path.join(themeDir, composerEdge.image);
    const composerEdgeStat = await fs.stat(composerEdgePath);
    if (!composerEdgeStat.isFile() || composerEdgeStat.size < 1 || composerEdgeStat.size > 2 * 1024 * 1024) {
      throw new Error("Composer edge must be non-empty and no larger than 2 MB");
    }
    const composerEdgeBytes = await fs.readFile(composerEdgePath);
    const composerEdgeMime = path.extname(composerEdge.image).toLowerCase() === ".webp" ? "image/webp" : "image/png";
    composerEdgeDataUrl = `url("data:${composerEdgeMime};base64,${composerEdgeBytes.toString("base64")}")`;
    const horizontal = ["left", "center", "right"].includes(composerEdge.horizontal)
      ? composerEdge.horizontal : "left";
    const vertical = ["top", "center", "bottom"].includes(composerEdge.vertical)
      ? composerEdge.vertical : "bottom";
    composerEdgePosition = `${horizontal} ${vertical}`;
    if (Number.isInteger(composerEdge.maxHeight) && composerEdge.maxHeight >= 48 && composerEdge.maxHeight <= 384) {
      composerEdgeMaxHeight = composerEdge.maxHeight;
    }
    if (typeof composerEdge.opacity === "number" && composerEdge.opacity >= 0.2 && composerEdge.opacity <= 1) {
      composerEdgeOpacity = composerEdge.opacity;
    }
  }
  const theme = {
    id: text(raw.id, "custom", 64),
    name: text(raw.name, "Dream Skin", 80),
    subtitle: text(raw.subtitle, "CODEX THEME", 80),
    accent: color(raw.colors?.accent, "#8b5cf6"),
    accentAlt: color(raw.colors?.accentAlt, "#ec4899"),
    surface: color(raw.colors?.surface, "#111318"),
    text: color(raw.colors?.text, "#f7f7f8"),
    icons: {},
  };
  for (const key of ["build", "analyze", "automate", "debug"]) {
    const filename = raw.icons?.[key];
    if (typeof filename !== "string" || path.basename(filename) !== filename || !/\.svg$/i.test(filename)) {
      throw new Error(`Theme icon ${key} must be an SVG file inside the theme directory`);
    }
    const iconPath = path.join(themeDir, filename);
    const iconStat = await fs.stat(iconPath);
    if (!iconStat.isFile() || iconStat.size < 1 || iconStat.size > 64 * 1024) {
      throw new Error(`Theme icon ${key} must be non-empty and no larger than 64 KB`);
    }
    const iconText = await fs.readFile(iconPath, "utf8");
    if (!/^<svg\b[^>]*>[\s\S]*<\/svg>\s*$/i.test(iconText.trim()) ||
        /<(?:script|foreignObject|iframe|image)\b|\bon\w+\s*=|\b(?:href|src)\s*=|url\s*\(/i.test(iconText)) {
      throw new Error(`Theme icon ${key} contains unsupported SVG content`);
    }
    theme.icons[key] = `data:image/svg+xml;base64,${Buffer.from(iconText).toString("base64")}`;
  }
  const art = await fs.readFile(imagePath);
  const extension = path.extname(image).toLowerCase();
  const mime = extension === ".webp" ? "image/webp" : extension === ".jpg" || extension === ".jpeg"
    ? "image/jpeg" : "image/png";
  const themeVariables = `:root.codex-dream-skin{--dream-purple:${theme.accent};--dream-pink:${theme.accentAlt};--dream-surface:${theme.surface};--dream-ink:${theme.text};--dream-sidebar-art:${sidebarImageDataUrl};--dream-selected-leaf:${selectedLeafDataUrl};--dream-composer-edge:${composerEdgeDataUrl};--dream-composer-edge-position:${composerEdgePosition};--dream-composer-edge-max-height:${composerEdgeMaxHeight}px;--dream-composer-edge-opacity:${composerEdgeOpacity};}`;
  const artDataUrl = `data:${mime};base64,${art.toString("base64")}`;
  const conversationArt = conversationImagePath === imagePath ? art : await fs.readFile(conversationImagePath);
  const conversationExtension = path.extname(conversationImage).toLowerCase();
  const conversationMime = conversationExtension === ".webp" ? "image/webp" :
    conversationExtension === ".jpg" || conversationExtension === ".jpeg" ? "image/jpeg" : "image/png";
  const conversationArtDataUrl = `data:${conversationMime};base64,${conversationArt.toString("base64")}`;
  return {
    ...theme,
    cssText: `${themeVariables}\n${baseCss}\n${themeCss}`,
    artDataUrl,
    conversationArtDataUrl,
    swatches: [theme.accent, theme.accentAlt, theme.surface],
  };
}

async function loadPayload(themeDir) {
  const [baseCss, template] = await Promise.all([
    fs.readFile(path.join(root, "assets", "base.css"), "utf8"),
    fs.readFile(path.join(root, "assets", "runtime.js"), "utf8"),
  ]);
  const initialThemeDir = path.resolve(themeDir);
  const themesRoot = path.dirname(initialThemeDir);
  const catalogPath = path.join(themesRoot, "theme-catalog.json");
  let themeIds = [path.basename(initialThemeDir)];
  try {
    const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.themes) || catalog.themes.length < 1) {
      throw new Error("Theme catalog must use schemaVersion 1 and include at least one theme ID");
    }
    themeIds = [...new Set(catalog.themes)];
    if (themeIds.some((id) => typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id))) {
      throw new Error("Theme catalog IDs must use lowercase letters, digits, and hyphens");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const initialThemeId = path.basename(initialThemeDir);
  if (!themeIds.includes(initialThemeId)) themeIds.unshift(initialThemeId);
  const themes = await Promise.all(themeIds.map(async (id) => {
    const directory = path.resolve(themesRoot, id);
    if (path.dirname(directory) !== themesRoot || path.basename(directory) !== id) {
      throw new Error(`Rejected theme catalog path: ${id}`);
    }
    const result = await loadThemePackage(directory, baseCss);
    if (result.id !== id) throw new Error(`Theme ID ${result.id} must match its directory ${id}`);
    return result;
  }));
  return template
    .replace("__DREAM_THEME_CATALOG_JSON__", JSON.stringify(themes))
    .replace("__DREAM_INITIAL_THEME_ID_JSON__", JSON.stringify(initialThemeId));
}

async function probeSession(session) {
  return session.evaluate(`(() => {
    const markers = {
      shell: Boolean(document.querySelector('main.main-surface')),
      sidebar: Boolean(document.querySelector('aside.app-shell-left-panel')),
      composer: Boolean(document.querySelector('.composer-surface-chrome')),
      main: Boolean(document.querySelector('[role="main"]')),
    };
    return {
      markers,
      codex: location.protocol === 'app:' && markers.shell && markers.sidebar && (markers.composer || markers.main),
    };
  })()`);
}

async function connectTarget(target, port) {
  return new CdpSession(target, port).open();
}

async function connectCodexTargets(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const targets = await listAppTargets(port, options.browserId);
      const connected = [];
      for (const target of targets) {
        let session;
        try {
          session = await connectTarget(target, port);
          const probe = await probeSession(session);
          if (probe?.codex) connected.push({ target, session, probe });
          else session.close();
        } catch (error) {
          session?.close();
          lastError = error;
        }
      }
      if (connected.length) return connected;
      lastError = new Error("No page matched the expected Codex shell markers");
    } catch (error) {
      if (error instanceof CdpIdentityMismatchError) throw error;
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`No verified Codex renderer on 127.0.0.1:${port}: ${lastError?.message ?? "timed out"}`);
}

async function applyToSession(session, payload) {
  return session.evaluate(payload);
}

async function removeFromSession(session) {
  return session.evaluate(`(() => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    const state = window.__CODEX_DREAM_SKIN_STATE__;
    if (state?.cleanup) return state.cleanup();
    document.documentElement?.classList.remove('codex-dream-skin');
    document.documentElement?.style.removeProperty('--dream-art');
    document.querySelectorAll('.dream-home').forEach((node) => node.classList.remove('dream-home'));
    document.querySelectorAll('.dream-home-shell').forEach((node) => node.classList.remove('dream-home-shell'));
    document.getElementById('codex-dream-skin-style')?.remove();
    document.getElementById('codex-dream-skin-chrome')?.remove();
    document.getElementById('codex-dream-skin-actions')?.remove();
    document.getElementById('codex-dream-skin-title')?.remove();
    document.getElementById('codex-dream-theme-switcher')?.remove();
    delete window.__CODEX_DREAM_SKIN_STATE__;
    return true;
  })()`);
}

async function verifyRemovedSession(session) {
  return session.evaluate(`(() =>
    !document.documentElement.classList.contains('codex-dream-skin') &&
    !document.documentElement.style.getPropertyValue('--dream-art') &&
    !document.querySelector('.dream-home') &&
    !document.querySelector('.dream-home-shell') &&
    !document.getElementById('codex-dream-skin-style') &&
    !document.getElementById('codex-dream-skin-chrome') &&
    !document.getElementById('codex-dream-skin-actions') &&
    !document.getElementById('codex-dream-skin-title') &&
    !document.getElementById('codex-dream-theme-switcher') &&
    !window.__CODEX_DREAM_SKIN_STATE__
  )()`);
}

async function verifySession(session) {
  return session.evaluate(`(() => {
    const box = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    };
    const home = document.querySelector('.dream-home');
    const actionGrid = home?.querySelector('#codex-dream-skin-actions') ?? null;
    const cards = actionGrid ? [...actionGrid.querySelectorAll('button')].map(box) : [];
    const title = home?.querySelector('#codex-dream-skin-title') ?? null;
    const switcher = document.getElementById('codex-dream-theme-switcher');
    const themeCards = switcher ? [...switcher.querySelectorAll('[data-dream-theme-id]')] : [];
    const conversation = document.querySelector('[role="main"].dream-conversation');
    const outputPanel = document.querySelector('.dream-output-panel');
    const composerNode = document.querySelector('.composer-surface-chrome');
    const composerRect = composerNode?.getBoundingClientRect() ?? null;
    const stickyComposer = composerNode ? [...composerNode.closest('.thread-scroll-container')?.querySelectorAll('.sticky') ?? []]
      .find((node) => node.contains(composerNode)) : null;
    const composerEffects = stickyComposer ? [...stickyComposer.querySelectorAll('*')].slice(0, 500).map((node) => {
      const style = getComputedStyle(node);
      return {
        tag: node.tagName,
        className: typeof node.className === 'string' ? node.className.slice(0, 240) : '',
        box: box(node),
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage.slice(0, 160),
        boxShadow: style.boxShadow,
        filter: style.filter,
        backdropFilter: style.backdropFilter,
        webkitMaskImage: style.webkitMaskImage,
      };
    }).filter((item) => item.backgroundColor !== 'rgba(0, 0, 0, 0)' || item.backgroundImage !== 'none' ||
      item.boxShadow !== 'none' || item.filter !== 'none' || item.backdropFilter !== 'none' || item.webkitMaskImage !== 'none') : [];
    const inspectPoint = (x, y) => [...document.elementsFromPoint(x, y)].slice(0, 10).map((node) => {
      const style = getComputedStyle(node);
      return {
        tag: node.tagName,
        className: typeof node.className === 'string' ? node.className.slice(0, 240) : '',
        box: box(node),
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage.slice(0, 160),
        boxShadow: style.boxShadow,
        opacity: style.opacity,
      };
    });
    const composerAncestors = [];
    for (let node = composerNode; node && composerAncestors.length < 14; node = node.parentElement) {
      const style = getComputedStyle(node);
      const before = getComputedStyle(node, '::before');
      const after = getComputedStyle(node, '::after');
      composerAncestors.push({
        tag: node.tagName,
        className: typeof node.className === 'string' ? node.className.slice(0, 240) : '',
        box: box(node),
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage.slice(0, 160),
        boxShadow: style.boxShadow,
        webkitMaskImage: style.webkitMaskImage,
        maskImage: style.maskImage,
        backdropFilter: style.backdropFilter,
        before: { display: before.display, content: before.content, background: before.background.slice(0, 160), boxShadow: before.boxShadow },
        after: { display: after.display, content: after.content, background: after.background.slice(0, 160), boxShadow: after.boxShadow },
      });
    }
    const iconsPresent = actionGrid ? [...actionGrid.querySelectorAll('button')].every((button) => {
      const image = button.querySelector('img');
      return Boolean(image?.src?.startsWith('data:image/svg+xml;base64,'));
    }) : false;
    const result = {
      installed: document.documentElement.classList.contains('codex-dream-skin'),
      version: window.__CODEX_DREAM_SKIN_STATE__?.version ?? null,
      expectedVersion: ${JSON.stringify(SKIN_VERSION)},
      stylePresent: Boolean(document.getElementById('codex-dream-skin-style')),
      chromePresent: Boolean(document.getElementById('codex-dream-skin-chrome')),
      chromePointerEvents: getComputedStyle(document.getElementById('codex-dream-skin-chrome') || document.body).pointerEvents,
      homePresent: Boolean(home),
      actionGridPresent: Boolean(actionGrid),
      titlePresent: Boolean(title),
      iconsPresent,
      switcherPresent: Boolean(switcher),
      themeCardCount: themeCards.length,
      themeCount: window.__CODEX_DREAM_SKIN_STATE__?.themeCount ?? 0,
      activeThemeId: window.__CODEX_DREAM_SKIN_STATE__?.activeThemeId ?? null,
      conversation: conversation ? {
        box: box(conversation),
        backgroundColor: getComputedStyle(conversation).backgroundColor,
        backgroundImage: getComputedStyle(conversation).backgroundImage.slice(0, 160),
        children: [...conversation.children].slice(0, 8).map((node) => ({
          tag: node.tagName,
          className: typeof node.className === 'string' ? node.className.slice(0, 180) : '',
          box: box(node),
          backgroundColor: getComputedStyle(node).backgroundColor,
          backgroundImage: getComputedStyle(node).backgroundImage.slice(0, 120),
        })),
      } : null,
      shell: document.querySelector('main.main-surface') ? {
        box: box(document.querySelector('main.main-surface')),
        className: document.querySelector('main.main-surface').className,
        backgroundColor: getComputedStyle(document.querySelector('main.main-surface')).backgroundColor,
        backgroundImage: getComputedStyle(document.querySelector('main.main-surface')).backgroundImage.slice(0, 160),
        children: [...document.querySelector('main.main-surface').children].slice(0, 10).map((node) => ({
          tag: node.tagName,
          className: typeof node.className === 'string' ? node.className.slice(0, 220) : '',
          box: box(node),
          backgroundColor: getComputedStyle(node).backgroundColor,
          backgroundImage: getComputedStyle(node).backgroundImage.slice(0, 120),
        })),
      } : null,
      composerAncestors,
      composerEffects,
      composerSideStacks: composerRect ? {
        left: inspectPoint(Math.max(0, composerRect.left - 10), composerRect.top + composerRect.height / 2),
        right: inspectPoint(Math.min(innerWidth - 1, composerRect.right + 10), composerRect.top + composerRect.height / 2),
      } : null,
      hero: box(home?.firstElementChild?.firstElementChild?.firstElementChild),
      cards,
      composer: box(document.querySelector('.composer-surface-chrome')),
      sidebar: box(document.querySelector('aside.app-shell-left-panel')),
      viewport: { width: innerWidth, height: innerHeight },
      documentOverflow: {
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      },
      detailSurfaces: {
        progress: box(document.querySelector('.dream-progress-pill')),
        progressIndicator: box(document.querySelector('.dream-progress-indicator')),
        selectedThread: box(document.querySelector('.dream-selected-thread')),
        selectedThreadActions: [...document.querySelectorAll('.dream-selected-thread button')].map(box),
        outputPanel: box(outputPanel),
        outputPanelLayers: outputPanel ? [outputPanel, ...outputPanel.querySelectorAll('*')].slice(0, 160).map((node) => {
          const style = getComputedStyle(node);
          return {
            tag: node.tagName,
            className: typeof node.className === 'string' ? node.className.slice(0, 180) : '',
            box: box(node),
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage.slice(0, 120),
            borderColor: style.borderColor,
            borderRadius: style.borderRadius,
            overflow: style.overflow,
          };
        }).filter((item) => item.backgroundColor !== 'rgba(0, 0, 0, 0)' || item.backgroundImage !== 'none') : [],
      },
    };
    result.pass = result.installed && result.version === result.expectedVersion &&
      result.stylePresent && result.chromePresent &&
      result.chromePointerEvents === 'none' && Boolean(result.composer) && Boolean(result.sidebar) &&
      ((result.themeCount < 2 && !result.switcherPresent && result.themeCardCount === 0) ||
        (result.themeCount >= 2 && result.switcherPresent && result.themeCardCount === result.themeCount)) &&
      Boolean(result.activeThemeId) &&
      (!result.homePresent || (Boolean(result.hero) && result.titlePresent &&
        result.actionGridPresent && result.iconsPresent && result.cards.length === 4));
    return result;
  })()`);
}

async function waitForVerifiedSession(session, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastResult;
  let lastError;
  while (Date.now() < deadline) {
    try {
      lastResult = await verifySession(session);
      lastError = null;
      if (lastResult.pass) return lastResult;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!lastResult && lastError) throw lastError;
  return lastResult;
}

async function capture(session, outputPath, hoverSelectedThread = false, openSwitcher = false) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  if (openSwitcher) {
    await session.evaluate(`(() => {
      const trigger = document.querySelector('#codex-dream-theme-switcher .dream-theme-trigger');
      if (!trigger) return false;
      if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
      return true;
    })()`);
  } else {
    await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  }
  const viewport = await session.evaluate("({ width: innerWidth, height: innerHeight })");
  const hoverPoint = hoverSelectedThread ? await session.evaluate(`(() => {
    const node = document.querySelector('.dream-selected-thread');
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width - 54, y: rect.top + rect.height / 2 };
  })()`) : null;
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: hoverPoint?.x ?? Math.max(1, viewport.width - 24),
    y: hoverPoint?.y ?? 20,
    button: "none",
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const result = await session.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await fs.writeFile(outputPath, Buffer.from(result.data, "base64"));
}

async function runOneShot(options) {
  const connected = await connectCodexTargets(options.port, options.timeoutMs);
  const payload = (options.mode === "once" || options.reload) ? await loadPayload(options.themeDir) : null;
  const results = [];
  let screenshotCaptured = false;
  try {
    for (const { target, session, probe } of connected) {
      try {
        if (options.openHome) {
          const opened = await session.evaluate(`(() => {
            const button = [...document.querySelectorAll('button')].find((candidate) =>
              /新建任务|new task/i.test(candidate.textContent || '')
            );
            if (!button) return false;
            button.click();
            return true;
          })()`);
          if (!opened) throw new Error('Could not locate the native New Task button for home capture');
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        if (options.mode === "remove") await removeFromSession(session);
        else if (options.mode === "once") await applyToSession(session, payload);
        if (options.mode === "once") {
          await new Promise((resolve) => setTimeout(resolve, 850));
        }
        if (options.reload) {
          await session.send("Page.reload", { ignoreCache: true });
          await new Promise((resolve) => setTimeout(resolve, 1600));
          if (options.mode !== "remove") await applyToSession(session, payload);
        }
        let actionTest = null;
        if (options.testActions) {
          actionTest = await session.evaluate(`(async () => {
            const button = document.querySelector('#codex-dream-skin-actions button');
            const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
            if (!button || !editor) return { pass: false, reason: 'missing control or composer' };
            const original = editor.textContent || '';
            button.click();
            await new Promise((resolve) => setTimeout(resolve, 80));
            const filled = editor.textContent || '';
            editor.focus();
            editor.textContent = original;
            editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
            return { pass: filled.includes('构建一个新的应用'), filled };
          })()`);
          if (!actionTest.pass) throw new Error(`Action interaction test failed: ${actionTest.reason || actionTest.filled || 'unknown'}`);
        }
        let switcherTest = null;
        if (options.testSwitcher) {
          switcherTest = await session.evaluate(`(async () => {
            const state = window.__CODEX_DREAM_SKIN_STATE__;
            const cards = [...document.querySelectorAll('#codex-dream-theme-switcher [data-dream-theme-id]')];
            if (!state || state.themeCount < 2 || cards.length !== state.themeCount) {
              return { pass: false, reason: 'missing state or incomplete theme catalog cards' };
            }
            const root = document.documentElement;
            const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
            const original = state.activeThemeId;
            const alternate = cards.find((card) => card.dataset.dreamThemeId !== original);
            alternate?.click();
            const firstTransitionStarted = root.classList.contains('dream-theme-transition-out');
            await new Promise((resolve) => setTimeout(resolve, 380));
            const changed = state.activeThemeId;
            const changedStyle = document.getElementById('codex-dream-skin-style')?.dataset.dreamThemeId;
            const firstTransitionEnded = !root.classList.contains('dream-theme-transition-out');
            const originalCard = cards.find((card) => card.dataset.dreamThemeId === original);
            originalCard?.click();
            const secondTransitionStarted = root.classList.contains('dream-theme-transition-out');
            await new Promise((resolve) => setTimeout(resolve, 380));
            const restored = state.activeThemeId;
            const secondTransitionEnded = !root.classList.contains('dream-theme-transition-out');
            return {
              pass: changed !== original && changedStyle === changed && restored === original &&
                (reducedMotion || (firstTransitionStarted && secondTransitionStarted)) &&
                firstTransitionEnded && secondTransitionEnded,
              original,
              changed,
              restored,
              reducedMotion,
              firstTransitionStarted,
              firstTransitionEnded,
              secondTransitionStarted,
              secondTransitionEnded
            };
          })()`);
          if (!switcherTest.pass) throw new Error(`Theme switcher interaction test failed: ${switcherTest.reason || JSON.stringify(switcherTest)}`);
        }
        if (options.selectTheme) {
          const selected = await session.evaluate(`window.__CODEX_DREAM_SKIN_STATE__?.activateTheme?.(${JSON.stringify(options.selectTheme)}) ?? false`);
          if (!selected) throw new Error(`Could not activate requested theme: ${options.selectTheme}`);
          await new Promise((resolve) => setTimeout(resolve, 180));
        }
        const verified = options.mode === "remove"
          ? await verifyRemovedSession(session)
          : (options.reload || options.mode === "once" || options.mode === "verify")
            ? await waitForVerifiedSession(session, options.timeoutMs)
            : await verifySession(session);
        results.push({ targetId: target.id, markers: probe.markers, actionTest, switcherTest, result: verified });
        if (options.screenshot && !screenshotCaptured) {
          await capture(session, options.screenshot, options.hoverSelectedThread, options.openSwitcher);
          screenshotCaptured = true;
        }
      } finally {
        session.close();
      }
    }
  } finally {
    for (const { session } of connected) session.close();
  }
  console.log(JSON.stringify({ mode: options.mode, port: options.port, targets: results }, null, 2));
  const failed = results.length === 0 || results.some((item) =>
    options.mode === "remove" ? item.result !== true : !item.result?.pass);
  if (failed) process.exitCode = 2;
}

async function runWatch(options) {
  const identityAnchor = await connectBrowserIdentityAnchor(options.port, options.browserId);
  const sessions = new Map();
  const targetFailures = new Map();
  let stopping = false;
  let listFailures = 0;
  let lastListErrorLogAt = 0;
  const stop = () => { stopping = true; };
  const rejectTarget = (target, baseDelayMs, error = null) => {
    const previous = targetFailures.get(target.id) ?? { failures: 0, lastLogAt: 0 };
    const failures = previous.failures + 1;
    const delayMs = Math.min(30000, baseDelayMs * (2 ** Math.min(failures - 1, 4)));
    const now = Date.now();
    if (error && (failures === 1 || now - previous.lastLogAt >= 30000)) {
      console.error(`[dream-skin] inject failed for ${target.id}: ${error.message}; retrying in ${delayMs}ms`);
      previous.lastLogAt = now;
    }
    targetFailures.set(target.id, { failures, lastLogAt: previous.lastLogAt, until: now + delayMs });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    const payload = await loadPayload(options.themeDir);
    while (!stopping) {
      if (identityAnchor.closed) {
        console.error("[dream-skin] original CDP browser identity closed; watcher is stopping instead of reconnecting");
        process.exitCode = 3;
        break;
      }
      let targets = [];
      try {
        targets = await listAppTargets(options.port);
        listFailures = 0;
      } catch (error) {
        listFailures += 1;
        const retryMs = Math.min(10000, 1000 * (2 ** Math.min(listFailures - 1, 4)));
        if (listFailures === 1 || Date.now() - lastListErrorLogAt >= 30000) {
          console.error(`[dream-skin] ${new Date().toISOString()} ${error.message}; retrying in ${retryMs}ms`);
          lastListErrorLogAt = Date.now();
        }
        await new Promise((resolve) => setTimeout(resolve, retryMs));
        continue;
      }

      const activeIds = new Set(targets.map((target) => target.id));
      for (const id of targetFailures.keys()) {
        if (!activeIds.has(id)) targetFailures.delete(id);
      }
      for (const [id, session] of sessions) {
        if (!activeIds.has(id) || session.closed) {
          session.close();
          sessions.delete(id);
          targetFailures.delete(id);
        }
      }

      for (const target of targets) {
        if (identityAnchor.closed) break;
        if (sessions.has(target.id)) continue;
        if ((targetFailures.get(target.id)?.until ?? 0) > Date.now()) continue;
        let session;
        try {
          session = await connectTarget(target, options.port);
          if (identityAnchor.closed) throw new CdpIdentityMismatchError("Original CDP browser identity closed");
          const probe = await probeSession(session);
          if (!probe?.codex) {
            rejectTarget(target, 5000);
            session.close();
            continue;
          }
          let lastReinjectErrorLogAt = 0;
          session.on("Page.loadEventFired", () => {
            setTimeout(() => applyToSession(session, payload).catch((error) => {
              if (Date.now() - lastReinjectErrorLogAt >= 30000) {
                console.error(`[dream-skin] reinject failed for ${target.id}: ${error.message}`);
                lastReinjectErrorLogAt = Date.now();
              }
            }), 250);
          });
          if (identityAnchor.closed) throw new CdpIdentityMismatchError("Original CDP browser identity closed");
          await applyToSession(session, payload);
          sessions.set(target.id, session);
          targetFailures.delete(target.id);
          console.log(`[dream-skin] injected target ${target.id}`);
        } catch (error) {
          session?.close();
          if (identityAnchor.closed || error instanceof CdpIdentityMismatchError) break;
          rejectTarget(target, 2500, error);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  } finally {
    identityAnchor.close();
    for (const session of sessions.values()) session.close();
  }
}

const options = parseArgs(process.argv.slice(2));
if (options.mode === "self-test") {
  const valid = validatedDebuggerUrl({ webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/page/test` }, options.port);
  const browserId = browserIdFromVersion({
    webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/browser/test-browser`,
  }, options.port);
  const invalid = [
    "ws://example.com/devtools/page/test",
    `ws://127.0.0.1:${options.port + 1}/devtools/page/test`,
    `wss://127.0.0.1:${options.port}/devtools/page/test`,
    `ws://user@127.0.0.1:${options.port}/devtools/page/test`,
    `ws://127.0.0.1:${options.port}/unexpected/test`,
    `ws://127.0.0.1:${options.port}/devtools/page/test?query=1`,
  ];
  for (const value of invalid) {
    let rejected = false;
    try { validatedDebuggerUrl({ webSocketDebuggerUrl: value }, options.port); } catch { rejected = true; }
    if (!rejected) throw new Error(`CDP URL validation accepted an unsafe URL: ${value}`);
  }
  const invalidBrowserUrls = [
    `ws://127.0.0.1:${options.port}/devtools/page/not-a-browser`,
    `ws://127.0.0.1:${options.port}/devtools/browser/bad%20id`,
    `ws://127.0.0.1:${options.port}/devtools/browser/test?query=1`,
  ];
  for (const value of invalidBrowserUrls) {
    let rejected = false;
    try { browserIdFromVersion({ webSocketDebuggerUrl: value }, options.port); } catch { rejected = true; }
    if (!rejected) throw new Error(`Browser identity validation accepted an unsafe URL: ${value}`);
  }
  const validPageTarget = {
    id: "page-test",
    type: "page",
    url: "app://codex/",
    webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/page/page-test`,
  };
  const invalidPageTargets = [
    { ...validPageTarget, webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/browser/page-test` },
    { ...validPageTarget, id: "other-page" },
    { ...validPageTarget, id: 123 },
    { ...validPageTarget, type: "other" },
  ];
  if (!valid || browserId !== "test-browser" || !isValidCdpPageTarget(validPageTarget, options.port) ||
      invalidPageTargets.some((item) => isValidCdpPageTarget(item, options.port))) {
    throw new Error("CDP URL and target validation self-test failed");
  }
  console.log(JSON.stringify({ pass: true, version: SKIN_VERSION, test: "loopback-cdp-validation" }));
} else if (options.mode === "check-payload") {
  const payload = await loadPayload(options.themeDir);
  if (payload.includes("__DREAM_THEME_CATALOG_JSON__") ||
      payload.includes("__DREAM_INITIAL_THEME_ID_JSON__")) {
    throw new Error("Payload placeholders were not fully replaced");
  }
  new Function(payload);
  console.log(JSON.stringify({ pass: true, version: SKIN_VERSION, payloadBytes: Buffer.byteLength(payload) }));
} else if (options.mode === "watch") await runWatch(options);
else await runOneShot(options);
