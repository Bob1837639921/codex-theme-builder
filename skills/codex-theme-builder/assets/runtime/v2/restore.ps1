[CmdletBinding()]
param([switch]$RestartCodex)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1')

$lock = Enter-DreamSkinOperationLock
try {
  $stateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkinV2'
  $statePath = Join-Path $stateRoot 'state.json'
  $state = Read-DreamSkinState -Path $statePath
  if ($null -eq $state) { Write-Host '当前没有正在运行的主题会话。'; return }

  $nodePath = if ($state.nodePath -and (Test-Path -LiteralPath $state.nodePath)) {
    "$($state.nodePath)"
  } else {
    (Get-DreamSkinNodeRuntime).Path
  }
  [void](Stop-DreamSkinRecordedInjector -State $state)
  & $nodePath $state.injectorPath --remove --port ([int]$state.port) `
    --browser-id $state.browserId --theme-dir $state.themeDir --timeout-ms 5000
  if ($LASTEXITCODE -ne 0) { throw '无法完整移除当前主题，运行状态已保留以便检查。' }

  if ($RestartCodex) {
    $codex = Get-DreamSkinCodexInstallFromState -State $state
    if ($null -eq $codex) { throw '已保存的 Codex 应用包身份已不再注册。' }
    Stop-DreamSkinCodex -Codex $codex -AllowForce
    Start-DreamSkinPackagedCodex -Codex $codex | Out-Null
  } else {
    Write-Warning '视觉主题已移除，但 CDP 调试端口会在 Codex 退出前保持开启。如需立即关闭，请使用 -RestartCodex。'
  }
  Remove-Item -LiteralPath $statePath -Force
  Write-Host 'Codex 主题已恢复。'
} finally {
  Exit-DreamSkinOperationLock -Mutex $lock
}
