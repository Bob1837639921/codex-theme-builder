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
$desktopLaunchText = Get-Content -LiteralPath (Join-Path $Root 'desktop-launch.ps1') -Raw -Encoding UTF8
$launcherUiPath = Join-Path $Root 'ui\launcher-ui.ps1'
if (-not (Test-Path -LiteralPath $launcherUiPath -PathType Leaf)) {
  throw 'The desktop launcher UI module is missing.'
}
$launcherUiText = Get-Content -LiteralPath $launcherUiPath -Raw -Encoding UTF8
$launcherScripts = @(
  (Join-Path $Root 'launch.ps1')
  (Join-Path $Root 'desktop-launch.ps1')
  $launcherUiPath
)
foreach ($launcherScript in $launcherScripts) {
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile(
    $launcherScript, [ref]$null, [ref]$parseErrors
  )
  if ($parseErrors.Count -gt 0) {
    throw "Launcher PowerShell syntax failed: $launcherScript"
  }
}
$expectedCurrentLaunchCopy = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5Li76aKY5bey5Yqg6L2977yMQ29kZXgg5Y2z5bCG5pi+56S6'))
$legacyNextLaunchCopy = @(
  [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5LiL5qyh5Y+v5Lul57un57ut5L2/55So5qGM6Z2i5b+r5o235pa55byP'))
  [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5Lul5ZCO57un57ut5L2/55So5qGM6Z2i5LiK55qE5LiH6LGh5b+r5o235pa55byP'))
)
if ($launchText -match '\[string\]\$Theme\s*=\s*\(Join-Path\s+\$PSScriptRoot') {
  throw 'Theme default must be resolved after parameter binding so PSScriptRoot is available.'
}
if ($launchText -notmatch '\[scriptblock\]\$ProgressCallback' -or
    $launchText -notmatch 'Report-DreamSkinLaunchProgress' -or
    $launchText -notmatch 'Report-DreamSkinLaunchStage' -or
    $launchText -notmatch "Verified = \[pscustomobject\]@\{ Percent = 96" -or
    $launchText -notmatch "-Stage WaitForCdp" -or
    $desktopLaunchText -notmatch '-ProgressCallback \$progressCallback' -or
    $launcherUiText -notmatch '\$Window\.Percent\.Text = ''100%''' -or
    $launcherUiText -notmatch '\$Window\.ProgressFill\.Width = \$Window\.ProgressTrack\.ClientSize\.Width' -or
    ($desktopLaunchText + $launcherUiText) -match 'ProgressBarStyle\]::Marquee') {
  throw 'Desktop progress must be driven by launch milestones and reach a verified 100%, not use an indeterminate marquee.'
}
if ($desktopLaunchText -notmatch "ui\\launcher-ui\.ps1" -or
    $desktopLaunchText -match 'function\s+(?:New-DreamSkinLaunchForm|New-DreamSkinLabel|New-DreamSkinProgressWindow)' -or
    $launcherUiText -notmatch 'System\.Windows\.Forms' -or
    $launcherUiText -notmatch 'Show-DreamSkinRestartDialog' -or
    $launcherUiText -notmatch 'New-DreamSkinProgressWindow' -or
    $launcherUiText -notmatch [regex]::Escape($expectedCurrentLaunchCopy) -or
    $launcherUiText -match 'Get-DreamSkinCodexInstall|Stop-DreamSkinCodex|launch\.ps1' -or
    ($desktopLaunchText + $launcherUiText) -match 'WScript\.Shell|\.Popup\(' -or
    @($legacyNextLaunchCopy | Where-Object { ($desktopLaunchText + $launcherUiText) -match [regex]::Escape($_) }).Count -gt 0) {
  throw 'The desktop launcher must use the branded single-window flow without legacy popups or redundant next-launch copy.'
}
if (($runtimeText -join "`n") -match '(?i)config\.toml|appearanceTheme|BaseUrl|ApiKey') {
  throw 'V2 runtime must not read or write Codex configuration or provider settings.'
}
$themeCss = Get-Content -LiteralPath (Join-Path $theme 'theme.css') -Raw
$baseCss = Get-Content -LiteralPath (Join-Path $Root 'assets\base.css') -Raw
$templateCss = Get-Content -LiteralPath (Join-Path $Root '..\..\theme-template\theme.css') -Raw
$runtimeJs = Get-Content -LiteralPath (Join-Path $Root 'assets\runtime.js') -Raw
$injectorText = Get-Content -LiteralPath $injector -Raw
$sunkenCss = Get-Content -LiteralPath (Join-Path $Root '..\..\themes\sunken-opera\theme.css') -Raw
$tidalCss = Get-Content -LiteralPath (Join-Path $Root '..\..\themes\tidal-hymn\theme.css') -Raw
$tidalTheme = Join-Path $Root '..\..\themes\tidal-hymn'
$tidalManifest = Get-Content -LiteralPath (Join-Path $tidalTheme 'theme.json') -Raw | ConvertFrom-Json
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
    $runtimeJs -notmatch 'codex-dream-motion-level' -or
    $runtimeJs -notmatch 'data-dream-motion-level' -or
    $runtimeJs -notmatch 'applyMotionLevel' -or
    $runtimeJs -notmatch 'root\.dataset\.dreamMotion' -or
    $runtimeJs -notmatch 'activateTheme' -or
    $runtimeJs -notmatch 'rolled back' -or
    $runtimeJs -notmatch 'event\.key === "Escape"' -or
    $runtimeJs -notmatch 'panel\.setAttribute\("popover", "manual"\)' -or
    $runtimeJs -notmatch 'positionPanel' -or
    $runtimeJs -notmatch 'window\.addEventListener\("resize", onViewportChange\)' -or
    $baseCss -notmatch '(?s)\.dream-theme-panel\s*\{[^}]*position:\s*fixed\s*!important' -or
    $baseCss -notmatch '(?s)\.dream-theme-card\s*\{[^}]*background:\s*rgb\(255 255 255 / 82%\)\s*!important' -or
    $baseCss -notmatch '(?s)\.dream-motion-options\s*\{[^}]*grid-template-columns:\s*repeat\(4' -or
    $baseCss -notmatch '(?s)\.dream-motion-option\.is-selected\s*\{[^}]*background:\s*#ffffff\s*!important' -or
    $baseCss -notmatch 'dream-theme-panel-in' -or
    $runtimeJs -match 'dream-theme-feedback' -or
    $baseCss -match 'dream-theme-feedback' -or
    $injectorText -notmatch 'Theme switcher interaction test failed') {
  throw 'The catalog-driven switcher must keep persistence, rollback, keyboard handling, and live interaction coverage.'
}
if ($templateCss -notmatch 'data-dream-motion="low"' -or
    $templateCss -notmatch 'data-dream-motion="high"' -or
    $templateCss -notmatch 'data-dream-motion="off"' -or
    $templateCss -notmatch 'theme-atmosphere-duration' -or
    $templateCss -notmatch 'dream-theme-motion-secondary' -or
    $templateCss -notmatch 'dream-theme-motion-tertiary' -or
    $tidalCss -notmatch 'data-dream-motion="off"' -or
    $tidalCss -notmatch 'tidal-hymn-drift' -or
    $tidalCss -notmatch 'tidal-hymn-spark-drift' -or
    $tidalCss -notmatch 'tidal-hymn-caustic-breathe' -or
    $tidalCss -notmatch 'background:\s*var\(--dream-motion-art,\s*none\)' -or
    $tidalCss -notmatch '(?s)data-dream-motion="low".*?--tidal-spark-display:\s*none' -or
    $tidalCss -notmatch '(?s)data-dream-motion="high".*?main\.main-surface\.dream-conversation-shell::after') {
  throw 'Motion-enabled themes must use distinct off/low/medium/high effect tiers and a reduced-motion fallback.'
}
if ($tidalManifest.motionImage -ne 'motion-caustics.webp' -or
    -not (Test-Path (Join-Path $tidalTheme $tidalManifest.motionImage)) -or
    (Get-Item -LiteralPath (Join-Path $tidalTheme $tidalManifest.motionImage)).Length -gt 2MB -or
    $injectorText -notmatch 'Motion image must be a WebP' -or
    $injectorText -notmatch 'motionArtDataUrl' -or
    $runtimeJs -notmatch '--dream-motion-art') {
  throw 'The optional pre-rendered motion asset contract must remain validated and bundled.'
}
if ($themeCss -notmatch '(?s)main\.dream-conversation-shell\s+\.sticky\.bottom-0\s+\[class~="bg-gradient-to-t"\]\s*\{[^}]*background-image:\s*none\s*!important') {
  throw 'Conversation composer fades must stay transparent, including the in-progress file-summary state.'
}
if ($themeCss -match 'group\\/project-selector' -or
    $baseCss -notmatch '(?s)main\.dream-home-shell \.dream-project-picker\s*\{[^}]*overflow:\s*hidden\s*!important' -or
    $baseCss -match '(?s)\.dream-project-picker\s*\{[^}]*(?:background|border(?:-radius)?|box-shadow|clip-path|margin|padding|position|z-index|width|height)\s*:') {
  throw 'Themes and shared CSS must leave the native project selector geometry and styling untouched.'
}
if ($baseCss -notmatch '(?s)aside\.app-shell-left-panel\s+\[class~="bg-token-bg-secondary/40"\]\s*\{[^}]*background-color:\s*transparent\s*!important[^}]*background-image:\s*none\s*!important') {
  throw 'The native light-mode sidebar carrier must stay transparent so it cannot veil theme artwork.'
}
if ($themeCss -notmatch '(?s)\[role="dialog"\]\s*\{[^}]*color:\s*var\(--dream-ink\)\s*!important[^}]*background-color:') {
  throw 'Portaled light dialogs must keep readable dark text after Codex updates.'
}
if ($baseCss -notmatch '(?s)aside\.app-shell-left-panel\s+\[role="status"\]\[class~="bg-token-main-surface-primary"\]\s*\{[^}]*color:\s*var\(--dream-ink') {
  throw 'The sidebar usage card must keep readable dark text on its light surface.'
}
if ($baseCss -notmatch '(?s)button\[class\*="text-token-input-placeholder-foreground"\]\[class\*="opacity-75"\]\s*\{[^}]*color:\s*var\(--dream-sidebar-control-text[^}]*opacity:\s*\.9\s*!important' -or
    $themeCss -notmatch '--dream-sidebar-control-text:') {
  throw 'Collapsed sidebar project controls must use a theme-owned readable foreground instead of the native dim placeholder color.'
}
if ($themeCss -notmatch '(?s)\[data-radix-popper-content-wrapper\].*?color:\s*var\(--dream-ink\)\s*!important') {
  throw 'Role-less Radix popovers must keep readable dark text after Codex updates.'
}
if ($runtimeJs -notmatch 'markDetailSurfaces' -or
  $runtimeJs -notmatch 'main\.dream-conversation-shell \.sticky\.bottom-0' -or
  $runtimeJs -notmatch 'detailState\.selectedThread' -or
  $runtimeJs -notmatch 'MUTATION_COALESCE_MS = 96' -or
  $runtimeJs -notmatch 'setTextIfChanged' -or
  $runtimeJs -notmatch 'mutationIsRuntimeOwned' -or
  $runtimeJs -notmatch 'outputScanRequested' -or
  $runtimeJs -notmatch 'requestAnimationFrame' -or
  $runtimeJs -match 'setTimeout\(\(\) => \{\s*scheduler\.timeout = null;\s*ensure\(\);\s*\}, 180\)' -or
  $runtimeJs -notmatch 'dream-selected-thread' -or
  $runtimeJs -notmatch 'dream-file-changes-summary' -or
  $runtimeJs -notmatch 'group/turn-diff-header' -or
  $runtimeJs -notmatch 'dream-output-panel' -or
  $runtimeJs -notmatch 'classList\?\.contains\("bg-token-dropdown-background"\)' -or
  $runtimeJs -notmatch 'outputCandidates\.find\(intersectsViewport\)' -or
  $runtimeJs -notmatch 'document\.querySelectorAll\("\.dream-output-panel"\)\.forEach') {
  throw 'Detail-surface markers must remain scoped, stable, frame-coalesced, and available for theme polish.'
}
if ($sunkenCss -notmatch '(?s)\.dream-file-changes-summary\s*\{[^}]*background:.*?border:' -or
    $sunkenCss -notmatch '(?s)\.dream-file-changes-summary.*?group\\\/turn-diff-header\s*\{[^}]*background:' -or
    $sunkenCss -notmatch '(?s)\[role="dialog"\]\s+:is\(div,\s*h1.*?color:\s*#eaf7fc\s*!important.*?-webkit-text-fill-color:\s*#eaf7fc\s*!important') {
  throw 'Dark themes must preserve readable file-change summaries and full-access dialog descendants.'
}
if ($templateCss -notmatch '(?s)\.dream-file-changes-summary\s*\{[^}]*background:\s*var\(--theme-solid-panel\)\s*!important[^}]*border:' -or
    $templateCss -notmatch '(?s)\.dream-file-changes-summary.*?group\\\/turn-diff-header\s*\{[^}]*background:' -or
    $templateCss -notmatch '(?s)\[role="dialog"\]\s+:is\(div,\s*h1.*?color:\s*var\(--theme-panel-text\)\s*!important.*?-webkit-text-fill-color:\s*var\(--theme-panel-text\)\s*!important' -or
    $templateCss -notmatch '(?s)\[role="dialog"\]\s+button\[class~="bg-token-foreground"\].*?color:\s*var\(--theme-primary-text\)\s*!important' -or
    $templateCss -notmatch '(?s)\[role="dialog"\]\s+:disabled\s*\{[^}]*opacity:') {
  throw 'Every newly scaffolded theme must inherit complete file-summary and portaled-dialog contrast coverage.'
}
if ($runtimeJs -notmatch 'codex-dream-home-overlay' -or
    $runtimeJs -notmatch 'dream-home-stage' -or
    $runtimeJs -notmatch 'dream-home-hero' -or
    $runtimeJs -notmatch 'dream-project-picker' -or
    $baseCss -notmatch '#codex-dream-home-overlay') {
  throw 'The reusable home overlay, full-width stage, and project-picker hooks must remain present.'
}
if ($templateCss -notmatch '(?s)main\.main-surface\.dream-home-shell.*?background-image:\s*var\(--dream-art\)\s*!important' -or
    $templateCss -notmatch '(?s)\.dream-home \.dream-home-hero\s*\{[^}]*border-radius:\s*0\s*!important[^}]*background:\s*transparent\s*!important') {
  throw 'New themes must paint home artwork on the full home shell and keep the native hero free of inset photo-frame styling.'
}
if ($runtimeJs -notmatch 'data-dream-sidebar-control' -or
    $runtimeJs -notmatch 'restoreSidebarControls' -or
    $runtimeJs -notmatch 'setProperty\("color", "var\(--dream-sidebar-control-text, #eef3ef\)", "important"\)' -or
    $runtimeJs -notmatch 'setProperty\("opacity", "\.9", "important"\)') {
  throw 'Sidebar collapse controls must receive reversible inline-important contrast because native important utilities override theme styles.'
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
