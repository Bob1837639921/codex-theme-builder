[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ThemePath,
  [Parameter(Mandatory)][string]$ScreenshotPath,
  [string]$ThemeId,
  [ValidateSet('off', 'low', 'high')][string]$MotionLevel,
  [switch]$OpenHome,
  [switch]$OpenSwitcher,
  [switch]$TestSwitcher,
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
# One-shot previews delegate to a persistent watcher so assets remain available
# after this script exits. Upgrade only the recorded injector, never Codex.
$identity = Get-DreamSkinCdpBrowserIdentity -Port ([int]$state.port)
if (-not $identity -or $identity.BrowserId -cne "$($state.browserId)") {
  throw 'The recorded themed Codex endpoint is unavailable or its browser identity changed.'
}
$serviceText = & $node $injector --check-service --port "$($state.port)" --browser-id "$($state.browserId)" --theme-dir $theme
$serviceReady = $LASTEXITCODE -eq 0
if ($serviceReady) {
  $serviceInfo = ($serviceText -join "`n") | ConvertFrom-Json
  $serviceReady = [bool](Get-Process -Id ([int]$state.injectorPid) -ErrorAction SilentlyContinue) -and
    @($serviceInfo.targets | Where-Object { $_.result.service.pid -ne $state.injectorPid }).Count -eq 0
}
if (-not $serviceReady) {
  $lock = Enter-DreamSkinOperationLock
  try {
    $state = Read-DreamSkinState -Path $statePath
    if (-not (Stop-DreamSkinRecordedInjector -State $state)) {
      throw 'Cannot upgrade an injector whose recorded process identity does not match.'
    }
    $watchArguments = @(
      (ConvertTo-DreamSkinProcessArgument -Value $injector), '--watch',
      '--port', "$($state.port)", '--browser-id', "$($state.browserId)",
      '--theme-dir', (ConvertTo-DreamSkinProcessArgument -Value $theme)
    )
    $stateRoot = Split-Path -Parent $statePath
    $daemon = Start-Process -FilePath $node -ArgumentList $watchArguments -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $stateRoot 'injector.log') `
      -RedirectStandardError (Join-Path $stateRoot 'injector-error.log')
    $state.injectorPid = $daemon.Id
    $state.injectorStartedAt = Get-DreamSkinProcessStartedAt -ProcessId $daemon.Id
    $state.injectorPath = $injector
    $state.nodePath = $node
    $state.themeDir = $theme
    if (-not $state.injectorStartedAt) { throw 'Cannot record the upgraded injector identity.' }
    Write-DreamSkinState -Path $statePath -State $state
    $deadline = (Get-Date).AddSeconds(20)
    do {
      Start-Sleep -Milliseconds 300
      if ($daemon.HasExited) { throw 'Upgraded asset service exited; inspect injector-error.log.' }
      $serviceText = & $node $injector --check-service --port "$($state.port)" --browser-id "$($state.browserId)" --theme-dir $theme
      $serviceReady = $LASTEXITCODE -eq 0
    } while (-not $serviceReady -and (Get-Date) -lt $deadline)
    if (-not $serviceReady) { throw 'Upgraded persistent asset service did not become ready.' }
  } finally {
    Exit-DreamSkinOperationLock -Mutex $lock
  }
}
$arguments = @(
  $injector, '--once', '--port', "$($state.port)", '--browser-id', "$($state.browserId)",
  '--theme-dir', $theme, '--screenshot', $screenshot
)
if ($OpenHome) { $arguments += '--open-home' }
if ($OpenSwitcher) { $arguments += '--open-switcher' }
if ($TestSwitcher) { $arguments += '--test-switcher' }
if ($ThemeId) { $arguments += @('--select-theme', $ThemeId) }
if ($MotionLevel) { $arguments += @('--motion-level', $MotionLevel) }
if ($HoverSelectedThread) { $arguments += '--hover-selected-thread' }

& $node @arguments
if ($LASTEXITCODE -ne 0) { throw 'Live theme preview or screenshot verification failed.' }
Write-Host "Preview captured: $screenshot"
Write-Output $screenshot
