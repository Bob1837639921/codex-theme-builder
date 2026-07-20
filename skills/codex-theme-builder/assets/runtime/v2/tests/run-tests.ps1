[CmdletBinding()]
param(
  [string]$ThemePath
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent $Root
. (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1')
$node = Get-DreamSkinNodeRuntime
$injector = Join-Path $Root 'scripts\injector.mjs'
$theme = if ($ThemePath) {
  (Resolve-Path -LiteralPath $ThemePath -ErrorAction Stop).Path
} else {
  Join-Path $Root '..\..\themes\ink-landscape'
}

& $node.Path --check $injector
if ($LASTEXITCODE -ne 0) { throw 'Injector syntax check failed.' }
& $node.Path $injector --self-test
if ($LASTEXITCODE -ne 0) { throw 'CDP validation self-test failed.' }
& $node.Path $injector --check-payload --theme-dir $theme
if ($LASTEXITCODE -ne 0) { throw 'Theme payload check failed.' }

$runtimeText = @('launch.ps1', 'restore.ps1') | ForEach-Object {
  Get-Content -LiteralPath (Join-Path $Root $_) -Raw
}
$commonText = Get-Content -LiteralPath (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1') -Raw
Initialize-DreamSkinApplicationActivationManager
if (-not ('DreamSkin.Windows.ApplicationActivationManager' -as [type])) {
  throw 'Packaged-app activation bridge did not compile.'
}
if (-not [DreamSkin.Windows.PackagedAppActivator]::IsAvailable()) {
  throw 'Windows packaged-app activation COM service is unavailable.'
}
if ($commonText -notmatch 'IApplicationActivationManager' -or
  ($runtimeText -join "`n") -match 'Start-Process\s+-FilePath\s+\$codex\.Executable') {
  throw 'V2 must activate the Store package through its AppUserModelID, not execute WindowsApps directly.'
}
$launchText = Get-Content -LiteralPath (Join-Path $Root 'launch.ps1') -Raw
if ($launchText -match '\[string\]\$Theme\s*=\s*\(Join-Path\s+\$PSScriptRoot') {
  throw 'Theme default must be resolved after parameter binding so PSScriptRoot is available.'
}
if (($runtimeText -join "`n") -match '(?i)config\.toml|appearanceTheme|BaseUrl|ApiKey') {
  throw 'V2 runtime must not read or write Codex configuration or provider settings.'
}
$themeCss = Get-Content -LiteralPath (Join-Path $theme 'theme.css') -Raw
$baseCss = Get-Content -LiteralPath (Join-Path $Root 'assets\base.css') -Raw
$runtimeJs = Get-Content -LiteralPath (Join-Path $Root 'assets\runtime.js') -Raw
$injectorText = Get-Content -LiteralPath $injector -Raw
$catalogPath = Join-Path (Split-Path -Parent $theme) 'theme-catalog.json'
$catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath (Join-Path $theme 'theme.json') -Raw | ConvertFrom-Json
$catalogThemeIds = @($catalog.themes)
if ($catalog.schemaVersion -ne 1 -or $catalogThemeIds.Count -lt 2 -or
    'ink-landscape' -notin $catalogThemeIds -or 'frost-sword-immortal' -notin $catalogThemeIds) {
  throw 'The bundled catalog must include the ink and sword-immortal examples and may include additional themes.'
}
if ($runtimeJs -notmatch 'codex-dream-theme-switcher' -or
    $runtimeJs -notmatch 'codex-dream-theme-active' -or
    $runtimeJs -notmatch 'activateTheme' -or
    $runtimeJs -notmatch 'rolled back' -or
    $runtimeJs -notmatch 'event\.key === "Escape"' -or
    $baseCss -notmatch 'dream-theme-panel-in' -or
    $baseCss -notmatch 'dream-theme-transition-out' -or
    $runtimeJs -notmatch 'THEME_FADE_OUT_MS' -or
    $runtimeJs -notmatch 'prefers-reduced-motion: reduce' -or
    $runtimeJs -match 'dream-theme-feedback' -or
    $baseCss -match 'dream-theme-feedback' -or
    $injectorText -notmatch 'Theme switcher interaction test failed') {
  throw 'The catalog-driven switcher must keep persistence, rollback, keyboard handling, fade transition, reduced-motion, and live interaction coverage.'
}
if ($themeCss -notmatch '(?s)main\.dream-conversation-shell\s+\.sticky\.bottom-0\s+\[class~="bg-gradient-to-t"\]\s*\{[^}]*background-image:\s*none\s*!important') {
  throw 'Conversation composer fades must stay transparent, including the in-progress file-summary state.'
}
if ($themeCss -notmatch '(?s)\[role="dialog"\]\s*\{[^}]*color:\s*var\(--dream-ink\)\s*!important[^}]*background-color:') {
  throw 'Portaled light dialogs must keep readable dark text after Codex updates.'
}
if ($baseCss -notmatch '(?s)aside\.app-shell-left-panel\s+\[role="status"\]\[class~="bg-token-main-surface-primary"\]\s*\{[^}]*color:\s*var\(--dream-ink') {
  throw 'The sidebar usage card must keep readable dark text on its light surface.'
}
if ($themeCss -notmatch '(?s)\[data-radix-popper-content-wrapper\].*?color:\s*var\(--dream-ink\)\s*!important') {
  throw 'Role-less Radix popovers must keep readable dark text after Codex updates.'
}
if ($runtimeJs -notmatch 'markDetailSurfaces' -or
  $runtimeJs -notmatch 'main\.dream-conversation-shell \.sticky\.bottom-0' -or
  $runtimeJs -notmatch 'markedThreads\.filter' -or
  $runtimeJs -notmatch 'requestAnimationFrame' -or
  $runtimeJs -match 'setTimeout\(\(\) => \{\s*scheduler\.timeout = null;\s*ensure\(\);\s*\}, 180\)' -or
  $runtimeJs -notmatch 'dream-selected-thread' -or
  $runtimeJs -notmatch 'dream-output-panel' -or
  $runtimeJs -notmatch 'classList\?\.contains\("bg-token-dropdown-background"\)' -or
  $runtimeJs -notmatch 'outputCandidates\.find\(intersectsViewport\)' -or
  $runtimeJs -notmatch 'document\.querySelectorAll\("\.dream-output-panel"\)\.forEach') {
  throw 'Detail-surface markers must remain scoped, stable, frame-coalesced, and available for theme polish.'
}
if ($themeCss -notmatch '@keyframes\s+dream-progress-turn' -or
  $themeCss -notmatch '(?s)\.dream-progress-indicator\s*\{[^}]*animation:' -or
  $themeCss -notmatch '(?s)@media\s*\(prefers-reduced-motion:\s*reduce\).*?\.dream-progress-indicator\s*\{[^}]*animation:\s*none' -or
  $runtimeJs -notmatch 'dream-selected-thread-label' -or
  $themeCss -notmatch '(?s)\.dream-selected-thread-label\s*\{[^}]*background-image:\s*var\(--dream-selected-leaf\)' -or
  $themeCss -notmatch '--dream-selected-leaf' -or
  $themeCss -notmatch '--dream-panel-white' -or
  $themeCss -notmatch '(?s)\.dream-output-panel\s*>\s*\*.*?background-color:\s*transparent') {
  throw 'Low-cost detail motion, selected state, output panel, and reduced-motion fallback must remain present.'
}
if ($manifest.selectedLeaf -ne 'selected-leaf.png' -or
    -not (Test-Path (Join-Path $theme $manifest.selectedLeaf)) -or
    $injectorText -notmatch 'Selected leaf must be a PNG or WebP') {
  throw 'The optional selected-state raster asset contract must remain validated and bundled.'
}
if ($manifest.composerEdge.image -ne 'composer-edge.png' -or
    -not (Test-Path (Join-Path $theme $manifest.composerEdge.image)) -or
    $injectorText -notmatch 'Composer edge must be a PNG or WebP' -or
    $injectorText -notmatch '--dream-composer-edge' -or
    $injectorText -notmatch '--dream-composer-edge-position' -or
    $baseCss -notmatch 'background-position:\s*var\(--dream-composer-edge-position' -or
    $baseCss -notmatch 'background-size:\s*auto\s+var\(--dream-composer-edge-max-height' -or
    $baseCss -notmatch '(?s)div:has\(> \.composer-surface-chrome\)::after\s*\{[^}]*background-image:\s*var\(--dream-composer-edge\)' -or
    $baseCss -notmatch 'inset:\s*-100px\s+-180px\s+-12px\s+-76px' -or
    $baseCss -notmatch '(?s)div:has\(> \.composer-surface-chrome\)::after\s*\{[^}]*z-index:\s*2' -or
    $baseCss -notmatch '(?s)\.composer-surface-chrome\s*>\s*\*\s*\{[^}]*z-index:\s*3' -or
    $themeCss -match '(?s)div:has\(> \.composer-surface-chrome\)::after\s*,.*?display:\s*none') {
  throw 'The theme-specific composer-edge raster contract and shared rendering hook must remain validated and bundled.'
}
Write-Host 'PASS: syntax, CDP validation, selected theme payload, composer fade regression, dialog contrast regression, detail polish, reduced motion, Store activation bridge, launch defaults, and zero-config-invasion checks.'
