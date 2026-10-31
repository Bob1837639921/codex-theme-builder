[CmdletBinding()]
param(
  [string]$Theme = '',
  [switch]$ForegroundInjector,
  [scriptblock]$ProgressCallback
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Theme)) {
  $Theme = Join-Path $PSScriptRoot '..\..\themes\ink-landscape'
}
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1')

$launchStages = [ordered]@{
  ValidateTheme = [pscustomobject]@{ Percent = 18; Status = '正在验证主题文件…' }
  DiscoverRuntime = [pscustomobject]@{ Percent = 24; Status = '正在检查 Node.js 与 Codex 运行环境…' }
  AllocatePort = [pscustomobject]@{ Percent = 32; Status = '正在分配安全的本机调试端口…' }
  ActivateCodex = [pscustomobject]@{ Percent = 40; Status = '正在启动 Codex…' }
  PrepareInjector = [pscustomobject]@{ Percent = 64; Status = '已连接 Codex，正在准备主题注入器…' }
  StartInjector = [pscustomobject]@{ Percent = 72; Status = '正在启动主题注入器…' }
  PersistState = [pscustomobject]@{ Percent = 82; Status = '正在记录安全会话状态…' }
  VerifyInjection = [pscustomobject]@{ Percent = 90; Status = '正在验证主题是否完整加载…' }
  Verified = [pscustomobject]@{ Percent = 96; Status = '主题验证通过，正在完成启动…' }
}

function Report-DreamSkinLaunchProgress {
  param(
    [ValidateRange(0, 100)][int]$Percent,
    [Parameter(Mandatory)][string]$Status,
    [string]$Stage = 'RuntimeProgress'
  )
  if ($null -eq $ProgressCallback) { return }
  & $ProgressCallback $Percent $Status $Stage
}

function Report-DreamSkinLaunchStage {
  param(
    [Parameter(Mandatory)]
    [ValidateSet('ValidateTheme', 'DiscoverRuntime', 'AllocatePort', 'ActivateCodex', 'PrepareInjector', 'StartInjector', 'PersistState', 'VerifyInjection', 'Verified')]
    [string]$Stage
  )
  $definition = $launchStages[$Stage]
  Report-DreamSkinLaunchProgress -Percent $definition.Percent -Status $definition.Status -Stage $Stage
}

function Invoke-DreamSkinVerificationAttempt {
  param([string]$NodePath, [string]$InjectorPath, [int]$Port, [string]$BrowserId,
    [string]$ThemePath, [int]$AttemptTimeoutMs, [string]$VerificationLogPath, [scriptblock]$WaitCallback)
  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName = $NodePath
  $start.Arguments = (@($InjectorPath, '--verify', '--port', "$Port", '--browser-id', $BrowserId,
    '--theme-dir', $ThemePath, '--timeout-ms', "$AttemptTimeoutMs") |
    ForEach-Object { ConvertTo-DreamSkinProcessArgument -Value $_ }) -join ' '
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $start.StandardOutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $start.StandardErrorEncoding = New-Object System.Text.UTF8Encoding($false)
  $child = New-Object System.Diagnostics.Process
  $child.StartInfo = $start
  try {
    [void]$child.Start()
    # Drain both pipes concurrently. Native stderr must not become a terminating
    # PowerShell 5 NativeCommandError that bypasses the remaining attempts.
    $stdout = $child.StandardOutput.ReadToEndAsync()
    $stderr = $child.StandardError.ReadToEndAsync()
    $waitClock = [Diagnostics.Stopwatch]::StartNew()
    $timedOut = $false
    while (-not $child.WaitForExit(33)) {
      if ($WaitCallback) { & $WaitCallback }
      if ($waitClock.ElapsedMilliseconds -ge ($AttemptTimeoutMs + 5000)) { $timedOut = $true; break }
    }
    if ($timedOut) {
      $child.Kill()
      [void]$child.WaitForExit(3000)
    }
    if (-not $child.HasExited) { throw 'Verifier child did not exit after its deadline.' }
    foreach ($stream in @($stdout, $stderr)) {
      $output = $stream.GetAwaiter().GetResult()
      if ($output) { Add-Content -LiteralPath $VerificationLogPath -Encoding UTF8 -Value $output }
    }
    "verifier exit=$($child.ExitCode); timedOut=$timedOut" |
      Add-Content -LiteralPath $VerificationLogPath -Encoding UTF8
    return (-not $timedOut -and $child.ExitCode -eq 0)
  } catch {
    "verifier process error: $($_.Exception.Message)" |
      Add-Content -LiteralPath $VerificationLogPath -Encoding UTF8
    return $false
  } finally {
    try { if (-not $child.HasExited) { $child.Kill(); [void]$child.WaitForExit(2000) } } catch {}
    $child.Dispose()
  }
}

function Test-DreamSkinVerifiedInjection {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string]$NodePath,
    [Parameter(Mandatory)][string]$InjectorPath,
    [Parameter(Mandatory)][ValidateRange(1024, 65535)][int]$Port,
    [Parameter(Mandatory)][string]$BrowserId,
    [Parameter(Mandatory)][string]$ThemePath,
    [Parameter(Mandatory)][string]$VerificationLogPath,
    [ValidateRange(1, 6)][int]$VerificationAttempts = 3,
    [ValidateRange(1000, 30000)][int]$AttemptTimeoutMs = 20000
  )

  Remove-Item -LiteralPath $VerificationLogPath -Force -ErrorAction SilentlyContinue
  for ($verifyAttempt = 1; $verifyAttempt -le $VerificationAttempts; $verifyAttempt++) {
    if ($verifyAttempt -gt 1) {
      Report-DreamSkinLaunchProgress -Percent 90 `
        -Status "Codex 页面刚完成重载，正在重新验证主题（$verifyAttempt/$VerificationAttempts）…" `
        -Stage VerifyInjection
      Start-Sleep -Milliseconds 700
    }

    "[$((Get-Date).ToString('o'))] verification attempt $verifyAttempt/$VerificationAttempts" |
      Add-Content -LiteralPath $VerificationLogPath -Encoding UTF8
    if (Invoke-DreamSkinVerificationAttempt -NodePath $NodePath -InjectorPath $InjectorPath `
        -Port $Port -BrowserId $BrowserId -ThemePath $ThemePath `
        -AttemptTimeoutMs $AttemptTimeoutMs -VerificationLogPath $VerificationLogPath -WaitCallback {
          Report-DreamSkinLaunchProgress -Percent 90 -Status '正在验证主题是否完整加载…' -Stage VerifyInjection
        }) { return $true }
  }
  return $false
}

$lock = Enter-DreamSkinOperationLock
try {
  Report-DreamSkinLaunchStage -Stage ValidateTheme
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

  Report-DreamSkinLaunchStage -Stage DiscoverRuntime
  $node = Get-DreamSkinNodeRuntime
  $codex = Get-DreamSkinCodexInstall
  if ((Get-DreamSkinCodexProcesses -Codex $codex).Count -gt 0) {
    throw '请先关闭 Codex，再启动主题。未经用户明确确认，启动器不会强制重启 Codex。'
  }

  Report-DreamSkinLaunchStage -Stage AllocatePort
  $port = $null
  for ($attempt = 0; $attempt -lt 64; $attempt++) {
    $candidate = Get-Random -Minimum 49152 -Maximum 65535
    if (Test-DreamSkinPortAvailable -Port $candidate) { $port = $candidate; break }
  }
  if ($null -eq $port) { throw '无法分配随机的本机 CDP 端口。' }

  Report-DreamSkinLaunchStage -Stage ActivateCodex
  Start-DreamSkinPackagedCodex -Codex $codex -ArgumentList @(
    '--remote-debugging-address=127.0.0.1',
    "--remote-debugging-port=$port"
  ) | Out-Null

  $deadline = (Get-Date).AddSeconds(90)
  $identity = Get-DreamSkinVerifiedCdpIdentity -Port $port -Codex $codex
  $pollCount = 0
  while ($null -eq $identity -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 350
    $pollCount++
    $waitPercent = [Math]::Min(60, 42 + [Math]::Floor($pollCount / 6))
    Report-DreamSkinLaunchProgress -Percent $waitPercent -Status '正在等待 Codex 完成启动…' -Stage WaitForCdp
    $identity = Get-DreamSkinVerifiedCdpIdentity -Port $port -Codex $codex
  }
  if ($null -eq $identity) {
    throw "Codex 启动后 90 秒内未提供通过身份验证的本机调试端点（端口 $port）。已保留 Codex 窗口；请勿连续重复启动，保存内容后完全退出再重试。"
  }

  Report-DreamSkinLaunchStage -Stage PrepareInjector
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

  Report-DreamSkinLaunchStage -Stage StartInjector
  $stdout = Join-Path $stateRoot 'injector.log'
  $stderr = Join-Path $stateRoot 'injector-error.log'
  $daemon = Start-Process -FilePath $node.Path -ArgumentList $args -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  Start-Sleep -Milliseconds 600
  if ($daemon.HasExited) { throw "主题注入程序在启动过程中意外退出。错误日志：$stderr" }
  $startedAt = Get-DreamSkinProcessStartedAt -ProcessId $daemon.Id
  if (-not $startedAt) { throw '无法记录主题注入程序的进程身份。' }

  Report-DreamSkinLaunchStage -Stage PersistState
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

  Report-DreamSkinLaunchStage -Stage VerifyInjection
  $verificationLog = Join-Path $stateRoot 'verification.log'
  $verified = Test-DreamSkinVerifiedInjection -NodePath $node.Path -InjectorPath $injector `
    -Port $port -BrowserId $identity.BrowserId -ThemePath $Theme `
    -VerificationLogPath $verificationLog
  if (-not $verified) {
    $details = (Get-Content -LiteralPath $verificationLog -Tail 12 -ErrorAction SilentlyContinue) -join "`n"
    throw "主题注入验证失败（已完成有限重试）。验证日志：$verificationLog`n$details"
  }
  Report-DreamSkinLaunchStage -Stage Verified
  Write-Host "主题已在随机本机端口（$port）上启用。"
} finally {
  if ($null -ne $lock) { Exit-DreamSkinOperationLock -Mutex $lock }
}
