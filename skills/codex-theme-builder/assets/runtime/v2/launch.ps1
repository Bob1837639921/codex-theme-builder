[CmdletBinding()]
param(
  [string]$Theme = '',
  [switch]$ForegroundInjector
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Theme)) {
  $Theme = Join-Path $PSScriptRoot '..\..\themes\ink-landscape'
}
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1')

$lock = Enter-DreamSkinOperationLock
try {
  $Theme = [System.IO.Path]::GetFullPath($Theme)
  if (-not (Test-Path -LiteralPath (Join-Path $Theme 'theme.json'))) {
    throw "Theme manifest not found: $Theme"
  }

  $stateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkinV2'
  $statePath = Join-Path $stateRoot 'state.json'
  $injector = Join-Path $PSScriptRoot 'scripts\injector.mjs'
  New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
  if (Test-Path -LiteralPath $statePath) {
    throw 'A V2 session already exists. Run restore.ps1 before starting another theme.'
  }

  $node = Get-DreamSkinNodeRuntime
  $codex = Get-DreamSkinCodexInstall
  if ((Get-DreamSkinCodexProcesses -Codex $codex).Count -gt 0) {
    throw 'Close Codex before starting V2. The prototype never forces a restart without explicit user action.'
  }

  $port = $null
  for ($attempt = 0; $attempt -lt 64; $attempt++) {
    $candidate = Get-Random -Minimum 49152 -Maximum 65535
    if (Test-DreamSkinPortAvailable -Port $candidate) { $port = $candidate; break }
  }
  if ($null -eq $port) { throw 'Could not reserve a random loopback CDP port.' }

  Start-DreamSkinPackagedCodex -Codex $codex -ArgumentList @(
    '--remote-debugging-address=127.0.0.1',
    "--remote-debugging-port=$port"
  ) | Out-Null

  $deadline = (Get-Date).AddSeconds(45)
  $identity = Get-DreamSkinVerifiedCdpIdentity -Port $port -Codex $codex
  while ($null -eq $identity -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 350
    $identity = Get-DreamSkinVerifiedCdpIdentity -Port $port -Codex $codex
  }
  if ($null -eq $identity) {
    Stop-DreamSkinCodex -Codex $codex -AllowForce
    throw 'Codex did not expose a verified loopback CDP endpoint.'
  }

  $args = @(
    (ConvertTo-DreamSkinProcessArgument -Value $injector), '--watch',
    '--port', "$port", '--browser-id', $identity.BrowserId,
    '--theme-dir', (ConvertTo-DreamSkinProcessArgument -Value $Theme)
  )
  if ($ForegroundInjector) {
    Exit-DreamSkinOperationLock -Mutex $lock
    $lock = $null
    & $node.Path $injector --watch --port $port --browser-id $identity.BrowserId --theme-dir $Theme
    exit $LASTEXITCODE
  }

  $stdout = Join-Path $stateRoot 'injector.log'
  $stderr = Join-Path $stateRoot 'injector-error.log'
  $daemon = Start-Process -FilePath $node.Path -ArgumentList $args -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  Start-Sleep -Milliseconds 600
  if ($daemon.HasExited) { throw "The injector exited during startup. See $stderr" }
  $startedAt = Get-DreamSkinProcessStartedAt -ProcessId $daemon.Id
  if (-not $startedAt) { throw 'Could not record injector process identity.' }

  $state = [pscustomobject]@{
    schemaVersion = 3
    platform = 'windows'
    port = $port
    browserId = $identity.BrowserId
    injectorPid = $daemon.Id
    injectorStartedAt = $startedAt
    injectorPath = $injector
    nodePath = $node.Path
    nodeVersion = $node.Version
    codexExe = $codex.Executable
    codexPackageRoot = $codex.PackageRoot
    codexPackageFullName = $codex.PackageFullName
    codexPackageFamilyName = $codex.PackageFamilyName
    codexVersion = $codex.Version
    themeDir = $Theme
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  Write-DreamSkinState -Path $statePath -State $state

  & $node.Path $injector --verify --port $port --browser-id $identity.BrowserId --theme-dir $Theme
  if ($LASTEXITCODE -ne 0) { throw 'V2 injection verification failed.' }
  Write-Host "Dream Skin V2 is active on a random loopback port ($port)."
} finally {
  if ($null -ne $lock) { Exit-DreamSkinOperationLock -Mutex $lock }
}
