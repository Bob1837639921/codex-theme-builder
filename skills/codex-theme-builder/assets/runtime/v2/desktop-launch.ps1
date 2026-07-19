[CmdletBinding()]
param(
  [string]$Theme = '',
  [string]$ThemeName = '墨境主题'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1')

if ([string]::IsNullOrWhiteSpace($Theme)) {
  $Theme = Join-Path $PSScriptRoot '..\..\themes\ink-landscape'
}
$Theme = [System.IO.Path]::GetFullPath($Theme)
if ([string]::IsNullOrWhiteSpace($ThemeName)) { $ThemeName = 'Codex 主题' }

$bundledNodeDir = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
if (Test-Path -LiteralPath (Join-Path $bundledNodeDir 'node.exe')) {
  $env:PATH = "$bundledNodeDir;$env:PATH"
}

$shell = New-Object -ComObject WScript.Shell
$stateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkinV2'
$desktopLog = Join-Path $stateRoot 'desktop-launch.log'

function Write-DreamSkinDesktopLaunchLog {
  param([Parameter(Mandatory)][string]$Message)
  try {
    New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
    Add-Content -LiteralPath $desktopLog -Encoding UTF8 `
      -Value "[$((Get-Date).ToString('o'))] $Message"
  } catch {}
}

function Show-DreamSkinMessage {
  param(
    [Parameter(Mandatory)][string]$Message,
    [string]$Title = '',
    [int]$Type = 64,
    [int]$TimeoutSeconds = 0
  )
  if ([string]::IsNullOrWhiteSpace($Title)) { $Title = "Codex $ThemeName" }
  return $shell.Popup($Message, $TimeoutSeconds, $Title, $Type)
}

try {
  Write-DreamSkinDesktopLaunchLog -Message "桌面快捷启动已触发。主题：$ThemeName；路径：$Theme"
  $codex = Get-DreamSkinCodexInstall
  $codexProcesses = @(Get-DreamSkinCodexProcesses -Codex $codex)
  if ($codexProcesses.Count -gt 0) {
    Write-DreamSkinDesktopLaunchLog -Message "检测到 $($codexProcesses.Count) 个 Codex 进程，等待用户确认重启。"
    $choice = Show-DreamSkinMessage `
      -Message "Codex 正在运行。是否关闭并使用$ThemeName重新启动？`n`n尚未发送的输入内容可能会丢失。" `
      -Type 36
    if ($choice -ne 6) {
      Write-DreamSkinDesktopLaunchLog -Message '用户取消了主题重启。'
      exit 0
    }
    Stop-DreamSkinCodex -Codex $codex -AllowForce
    Start-Sleep -Milliseconds 800
  } else {
    Write-DreamSkinDesktopLaunchLog -Message 'Codex 当前未运行，进入冷启动流程。'
    [void](Show-DreamSkinMessage -Message "Codex 当前未运行。`n正在启动$ThemeName，请稍候……" -TimeoutSeconds 2)
  }

  $statePath = Join-Path $stateRoot 'state.json'
  if (Test-Path -LiteralPath $statePath) {
    Write-DreamSkinDesktopLaunchLog -Message '正在检查并清理上一次主题会话状态。'
    $state = Read-DreamSkinState -Path $statePath
    if ($null -ne $state) {
      [void](Stop-DreamSkinRecordedInjector -State $state)
    }
    Remove-Item -LiteralPath $statePath -Force
  }

  & (Join-Path $PSScriptRoot 'launch.ps1') -Theme $Theme | Out-Null
  Write-DreamSkinDesktopLaunchLog -Message '主题启动和注入验证已完成。'
  [void](Show-DreamSkinMessage -Message "$ThemeName 已启用。`n下次可以继续使用桌面快捷方式启动。" -TimeoutSeconds 3)
  $activated = Show-DreamSkinCodexWindow -Codex $codex -TimeoutSeconds 8
  Write-DreamSkinDesktopLaunchLog -Message "Codex 主窗口前台激活结果：$activated"
} catch {
  Write-DreamSkinDesktopLaunchLog -Message "主题启动失败：$($_.Exception.Message)"
  [void](Show-DreamSkinMessage -Message "$ThemeName 启动失败：`n$($_.Exception.Message)" -Type 16)
  exit 1
}
