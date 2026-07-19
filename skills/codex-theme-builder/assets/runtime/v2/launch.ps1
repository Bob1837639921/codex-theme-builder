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
    throw "找不到主题清单文件：$Theme"
  }

  $stateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkinV2'
  $statePath = Join-Path $stateRoot 'state.json'
  $injector = Join-Path $PSScriptRoot 'scripts\injector.mjs'
  New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
  if (Test-Path -LiteralPath $statePath) {
    throw '已经存在一个主题会话。请先运行 restore.ps1 恢复，再启动其他主题。'
  }

  $node = Get-DreamSkinNodeRuntime
  $codex = Get-DreamSkinCodexInstall
  if ((Get-DreamSkinCodexProcesses -Codex $codex).Count -gt 0) {
    throw '请先关闭 Codex，再启动主题。未经用户明确确认，启动器不会强制重启 Codex。'
  }

  $port = $null
  for ($attempt = 0; $attempt -lt 64; $attempt++) {
    $candidate = Get-Random -Minimum 49152 -Maximum 65535
    if (Test-DreamSkinPortAvailable -Port $candidate) { $port = $candidate; break }
  }
  if ($null -eq $port) { throw '无法分配随机的本机 CDP 端口。' }

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
    throw 'Codex 未能提供通过验证的本机 CDP 调试端点。'
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
  if ($daemon.HasExited) { throw "主题注入程序在启动过程中意外退出。错误日志：$stderr" }
  $startedAt = Get-DreamSkinProcessStartedAt -ProcessId $daemon.Id
  if (-not $startedAt) { throw '无法记录主题注入程序的进程身份。' }

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
  if ($LASTEXITCODE -ne 0) { throw '主题注入验证失败。' }
  Write-Host "主题已在随机本机端口（$port）上启用。"
} finally {
  if ($null -ne $lock) { Exit-DreamSkinOperationLock -Mutex $lock }
}
