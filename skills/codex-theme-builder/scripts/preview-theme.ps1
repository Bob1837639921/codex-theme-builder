[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ThemePath,
  [Parameter(Mandatory)][string]$ScreenshotPath,
  [string]$ThemeId,
  [switch]$OpenHome,
  [switch]$HoverSelectedThread
)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $skillRoot 'assets\runtime'
$runtime = Join-Path $runtimeRoot 'v2'
$theme = [System.IO.Path]::GetFullPath($ThemePath)
$screenshot = [System.IO.Path]::GetFullPath($ScreenshotPath)

& (Join-Path $PSScriptRoot 'test-theme.ps1') -ThemePath $theme
if ($LASTEXITCODE -ne 0) { throw 'Theme validation failed before preview.' }

. (Join-Path $runtimeRoot 'windows\scripts\common-windows.ps1')
$statePath = Join-Path $env:LOCALAPPDATA 'CodexDreamSkinV2\state.json'
$state = Read-DreamSkinState -Path $statePath
if ($null -eq $state) {
  throw 'No active themed Codex session exists. Close Codex and use start-theme.ps1 first.'
}
$node = if ($state.nodePath -and (Test-Path -LiteralPath $state.nodePath -PathType Leaf)) {
  "$($state.nodePath)"
} else {
  (Get-DreamSkinNodeRuntime).Path
}
$injector = Join-Path $runtime 'scripts\injector.mjs'
$arguments = @(
  $injector, '--once', '--port', "$($state.port)", '--browser-id', "$($state.browserId)",
  '--theme-dir', $theme, '--screenshot', $screenshot
)
if ($OpenHome) { $arguments += '--open-home' }
if ($ThemeId) { $arguments += @('--select-theme', $ThemeId) }
if ($HoverSelectedThread) { $arguments += '--hover-selected-thread' }

& $node @arguments
if ($LASTEXITCODE -ne 0) { throw 'Live theme preview or screenshot verification failed.' }
Write-Host "Preview captured: $screenshot"
Write-Output $screenshot
