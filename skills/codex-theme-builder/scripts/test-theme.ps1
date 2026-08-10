[CmdletBinding()]
param([Parameter(Mandatory)][string]$ThemePath)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $skillRoot 'assets\runtime'
$runtime = Join-Path $runtimeRoot 'v2'
$theme = [System.IO.Path]::GetFullPath($ThemePath)

if (-not (Test-Path -LiteralPath (Join-Path $theme 'theme.json') -PathType Leaf)) {
  throw "Theme manifest not found: $theme"
}

$themeManifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $theme 'theme.json') |
  ConvertFrom-Json -ErrorAction Stop
if ([string]::IsNullOrWhiteSpace($themeManifest.usageImage)) {
  throw 'Theme manifest must declare a dedicated usageImage.'
}
$usageImage = Join-Path $theme $themeManifest.usageImage
if (-not (Test-Path -LiteralPath $usageImage -PathType Leaf)) {
  throw "Dedicated usage-panel artwork is missing: $usageImage"
}
if ((Get-Item -LiteralPath $usageImage).Length -gt 300KB) {
  throw "Dedicated usage-panel artwork must remain at or below 300 KB: $usageImage"
}
if ([string]::IsNullOrWhiteSpace($themeManifest.selectedLeaf)) {
  throw 'Theme manifest must declare selectedLeaf for the selected-thread background.'
}
$selectedThreadBackground = Join-Path $theme $themeManifest.selectedLeaf
if (-not (Test-Path -LiteralPath $selectedThreadBackground -PathType Leaf)) {
  throw "Selected-thread background artwork is missing: $selectedThreadBackground"
}
if ([System.IO.Path]::GetExtension($selectedThreadBackground).ToLowerInvariant() -notin @('.png', '.webp')) {
  throw "Selected-thread background must be PNG or WebP: $selectedThreadBackground"
}
if ((Get-Item -LiteralPath $selectedThreadBackground).Length -gt 512KB) {
  throw "Selected-thread background must remain at or below 512 KB: $selectedThreadBackground"
}

$themeCssPath = Join-Path $theme 'theme.css'
if (-not (Test-Path -LiteralPath $themeCssPath -PathType Leaf)) {
  throw "Theme CSS is missing: $themeCssPath"
}
$themeCss = Get-Content -Raw -Encoding UTF8 -LiteralPath $themeCssPath
foreach ($token in @(
  '--dream-usage-ink',
  '--dream-usage-muted',
  '--dream-usage-accent',
  '--dream-usage-overlay',
  '--dream-usage-border'
)) {
  if ($themeCss -notmatch [regex]::Escape($token)) {
    throw "Theme CSS must define the usage-panel token: $token"
  }
}
if ($themeCss -notmatch [regex]::Escape('--dream-selected-leaf')) {
  throw 'Theme CSS must render the selected-thread background through --dream-selected-leaf.'
}

. (Join-Path $runtimeRoot 'windows\scripts\common-windows.ps1')
$node = Get-DreamSkinNodeRuntime

& $node.Path --check (Join-Path $runtime 'scripts\injector.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Injector JavaScript syntax check failed.' }
& $node.Path (Join-Path $runtime 'scripts\injector.mjs') --self-test
if ($LASTEXITCODE -ne 0) { throw 'CDP safety self-test failed.' }
& $node.Path (Join-Path $runtime 'scripts\injector.mjs') --check-payload --theme-dir $theme
if ($LASTEXITCODE -ne 0) { throw 'Theme payload validation failed.' }
& (Join-Path $PSScriptRoot 'inspect-theme-artwork.ps1') -ThemePath $theme
if ($LASTEXITCODE -ne 0) { throw 'Theme artwork inspection failed.' }

Write-Host "Theme validation passed: $theme"
