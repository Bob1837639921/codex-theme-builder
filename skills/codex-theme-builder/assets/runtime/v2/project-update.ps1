function Invoke-DreamSkinUpdateCommand {
  param(
    [string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory,
    [string]$LogPath, [string]$Status, [int]$Percent,
    [scriptblock]$ProgressCallback, [int]$TimeoutSeconds = 120
  )
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = $FilePath
  $info.Arguments = ($Arguments | ForEach-Object { ConvertTo-DreamSkinProcessArgument -Value $_ }) -join ' '
  $info.WorkingDirectory = $WorkingDirectory
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $info.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'
  $info.EnvironmentVariables['GCM_INTERACTIVE'] = 'Never'
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $info
  try {
    Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value "[$((Get-Date).ToString('o'))] $Status"
    if ($ProgressCallback) { & $ProgressCallback $Percent $Status }
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $watch = [Diagnostics.Stopwatch]::StartNew()
    while (-not $process.WaitForExit(100)) {
      if ($ProgressCallback) { & $ProgressCallback $Percent $Status }
      if ($watch.Elapsed.TotalSeconds -gt $TimeoutSeconds) {
        $process.Kill()
        Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value "Command timed out after $TimeoutSeconds seconds."
        throw "${Status}超时，请检查网络。日志：$LogPath"
      }
    }
    $output = $stdout.Result + $stderr.Result
    Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value "[$((Get-Date).ToString('o'))] $Status`r`n$output"
    if ($process.ExitCode -ne 0) { throw "${Status}失败（退出码 $($process.ExitCode)）。$output`r`n日志：$LogPath" }
    return $output.Trim()
  } finally { $process.Dispose() }
}

function Update-DreamSkinProject {
  param(
    [Parameter(Mandatory)][string]$RepositoryRoot,
    [Parameter(Mandatory)][string]$DestinationRoot,
    [string]$ThemeId = 'ink-landscape', [string]$ThemeName = '万象',
    [Parameter(Mandatory)][string]$LogPath, [scriptblock]$ProgressCallback
  )
  $repo = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd('\')
  if (-not (Test-Path -LiteralPath (Join-Path $repo 'scripts\setup-windows.ps1'))) {
    throw "主题项目不存在或不完整：$repo"
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null
  $mutex = New-Object Threading.Mutex($false, 'Local\CodexDreamSkinProjectUpdate')
  $held = $false
  try {
    try { $held = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held = $true }
    if (-not $held) { throw '主题项目正在更新，请等待当前启动完成。' }
    $git = (Get-Command git.exe -ErrorAction Stop).Source
    $invoke = @{ FilePath = $git; WorkingDirectory = $repo; LogPath = $LogPath; ProgressCallback = $ProgressCallback }
    $top = Invoke-DreamSkinUpdateCommand @invoke -Arguments @('-C', $repo, 'rev-parse', '--show-toplevel') -Status '正在检查主题项目…' -Percent 2
    if ([IO.Path]::GetFullPath($top).TrimEnd('\') -ine $repo) { throw '配置的主题目录不是 Git 仓库根目录。' }
    $dirty = Invoke-DreamSkinUpdateCommand @invoke -Arguments @('-C', $repo, 'status', '--porcelain', '--untracked-files=no') -Status '正在检查本地改动…' -Percent 4
    if ($dirty) { throw "主题项目有未提交改动，请先提交或处理后再启动。不会覆盖本地修改。`r`n$dirty" }
    [void](Invoke-DreamSkinUpdateCommand @invoke -Arguments @('-C', $repo, '-c', 'credential.interactive=never', 'pull', '--ff-only') -Status '正在拉取最新主题代码…' -Percent 8)
    $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    [void](Invoke-DreamSkinUpdateCommand -FilePath $powershell -WorkingDirectory $repo -LogPath $LogPath -ProgressCallback $ProgressCallback -TimeoutSeconds 300 `
      -Arguments @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repo 'scripts\setup-windows.ps1'), '-DestinationRoot', $DestinationRoot, '-ThemeId', $ThemeId, '-LauncherName', $ThemeName) `
      -Status '正在校验主题并更新本机配置…' -Percent 16)
    if ($ProgressCallback) { & $ProgressCallback 26 '主题代码和配置已更新，正在准备启动…' }
  } finally {
    if ($held) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
  }
}
