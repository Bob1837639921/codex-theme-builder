[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ThemePath,
  [Parameter(Mandatory)][switch]$ConfirmCodexClosed,
  [switch]$ForegroundInjector
)

$ErrorActionPreference = 'Stop'
if (-not $ConfirmCodexClosed) {
  throw 'Save drafts, fully exit Codex, then rerun with -ConfirmCodexClosed.'
}
$skillRoot = Split-Path -Parent $PSScriptRoot
$theme = [System.IO.Path]::GetFullPath($ThemePath)
& (Join-Path $skillRoot 'scripts\test-theme.ps1') -ThemePath $theme
& (Join-Path $skillRoot 'assets\runtime\v2\launch.ps1') -Theme $theme -ForegroundInjector:$ForegroundInjector
exit $LASTEXITCODE
