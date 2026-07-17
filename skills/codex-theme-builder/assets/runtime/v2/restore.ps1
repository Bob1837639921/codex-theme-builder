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
  if ($null -eq $state) { Write-Host 'No V2 session is active.'; return }

  $nodePath = if ($state.nodePath -and (Test-Path -LiteralPath $state.nodePath)) {
    "$($state.nodePath)"
  } else {
    (Get-DreamSkinNodeRuntime).Path
  }
  [void](Stop-DreamSkinRecordedInjector -State $state)
  & $nodePath $state.injectorPath --remove --port ([int]$state.port) `
    --browser-id $state.browserId --theme-dir $state.themeDir --timeout-ms 5000
  if ($LASTEXITCODE -ne 0) { throw 'The live theme could not be removed cleanly; state was preserved.' }

  if ($RestartCodex) {
    $codex = Get-DreamSkinCodexInstallFromState -State $state
    if ($null -eq $codex) { throw 'The saved Codex package identity is no longer registered.' }
    Stop-DreamSkinCodex -Codex $codex -AllowForce
    Start-DreamSkinPackagedCodex -Codex $codex | Out-Null
  } else {
    Write-Warning 'The visual theme is removed, but CDP remains open until Codex exits. Use -RestartCodex to close it now.'
  }
  Remove-Item -LiteralPath $statePath -Force
  Write-Host 'Dream Skin V2 was restored.'
} finally {
  Exit-DreamSkinOperationLock -Mutex $lock
}
