[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1')

$shell = New-Object -ComObject WScript.Shell

function Show-DreamSkinMessage {
  param(
    [Parameter(Mandatory)][string]$Message,
    [string]$Title = 'Codex Ink Theme',
    [int]$Type = 64,
    [int]$TimeoutSeconds = 0
  )
  return $shell.Popup($Message, $TimeoutSeconds, $Title, $Type)
}

try {
  $codex = Get-DreamSkinCodexInstall
  $codexProcesses = @(Get-DreamSkinCodexProcesses -Codex $codex)
  if ($codexProcesses.Count -gt 0) {
    $choice = Show-DreamSkinMessage `
      -Message "Codex is running. Close it and restart with the ink theme?`n`nUnsaved input may be lost." `
      -Type 36
    if ($choice -ne 6) { exit 0 }
    Stop-DreamSkinCodex -Codex $codex -AllowForce
    Start-Sleep -Milliseconds 800
  }

  $statePath = Join-Path $env:LOCALAPPDATA 'CodexDreamSkinV2\state.json'
  if (Test-Path -LiteralPath $statePath) {
    $state = Read-DreamSkinState -Path $statePath
    if ($null -ne $state) {
      [void](Stop-DreamSkinRecordedInjector -State $state)
    }
    Remove-Item -LiteralPath $statePath -Force
  }

  & (Join-Path $PSScriptRoot 'launch.ps1') | Out-Null
  [void](Show-DreamSkinMessage -Message "The ink theme is active.`nUse the desktop shortcut next time." -TimeoutSeconds 5)
} catch {
  [void](Show-DreamSkinMessage -Message "Could not start the ink theme:`n$($_.Exception.Message)" -Type 16)
  exit 1
}
