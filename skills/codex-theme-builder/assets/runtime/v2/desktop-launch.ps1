[CmdletBinding()]
param(
  [string]$Theme = '',
  [string]$ThemeName = '万象'
)

$ErrorActionPreference = 'Stop'
$RuntimeRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RuntimeRoot 'windows\scripts\common-windows.ps1')
. (Join-Path $PSScriptRoot 'ui\launcher-ui.ps1')

if ([string]::IsNullOrWhiteSpace($Theme)) {
  $Theme = Join-Path $PSScriptRoot '..\..\themes\ink-landscape'
}
$Theme = [System.IO.Path]::GetFullPath($Theme)
if ([string]::IsNullOrWhiteSpace($ThemeName)) { $ThemeName = '万象' }

$bundledNodeDir = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
if (Test-Path -LiteralPath (Join-Path $bundledNodeDir 'node.exe')) {
  $env:PATH = "$bundledNodeDir;$env:PATH"
}

$stateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkinV2'
$desktopLog = Join-Path $stateRoot 'desktop-launch.log'
$launchUiContext = [pscustomobject]@{
  ThemeName = $ThemeName
  LauncherIcon = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\launcher-icons\codex-myriad-full.ico'))
  DesktopLog = $desktopLog
}

function Write-DreamSkinDesktopLaunchLog {
  param([Parameter(Mandatory)][string]$Message)
  try {
    New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
    Add-Content -LiteralPath $desktopLog -Encoding UTF8 `
      -Value "[$((Get-Date).ToString('o'))] $Message"
  } catch {}
}

function Remove-DreamSkinPreviousSession {
  param(
    [Parameter(Mandatory)][string]$StatePath,
    [Parameter(Mandatory)]$ProgressWindow
  )
  if (-not (Test-Path -LiteralPath $StatePath)) { return }
  Set-DreamSkinProgressStatus -Window $ProgressWindow -Status '正在清理上一次主题会话…' -Percent 14
  Write-DreamSkinDesktopLaunchLog -Message '正在检查并清理上一次主题会话状态。'
  $state = Read-DreamSkinState -Path $StatePath
  if ($null -ne $state) {
    [void](Stop-DreamSkinRecordedInjector -State $state)
  }
  Remove-Item -LiteralPath $StatePath -Force
}

function Start-DreamSkinDesktopSession {
  param(
    [Parameter(Mandatory)][string]$ThemePath,
    [Parameter(Mandatory)]$ProgressWindow
  )
  Set-DreamSkinProgressStatus -Window $ProgressWindow -Status '正在启动 Codex 并加载主题资源…' -Percent 18
  $progressCallback = {
    param([int]$Percent, [string]$Status, [string]$Stage)
    Write-DreamSkinDesktopLaunchLog -Message "启动阶段：$Stage；$Percent%；$Status"
    Set-DreamSkinProgressStatus -Window $ProgressWindow -Status $Status -Percent $Percent
  }
  & (Join-Path $PSScriptRoot 'launch.ps1') -Theme $ThemePath -ProgressCallback $progressCallback | Out-Null
}

$progressWindow = $null
try {
  Write-DreamSkinDesktopLaunchLog -Message "桌面快捷启动已触发。主题：$ThemeName；路径：$Theme"
  $codex = Get-DreamSkinCodexInstall
  $codexProcesses = @(Get-DreamSkinCodexProcesses -Codex $codex)
  if ($codexProcesses.Count -gt 0) {
    Write-DreamSkinDesktopLaunchLog -Message "检测到 $($codexProcesses.Count) 个 Codex 进程，等待用户确认重启。"
    if (-not (Show-DreamSkinRestartDialog -Context $launchUiContext)) {
      Write-DreamSkinDesktopLaunchLog -Message '用户取消了主题重启。'
      exit 0
    }
    $progressWindow = New-DreamSkinProgressWindow -Context $launchUiContext
    Set-DreamSkinProgressStatus -Window $progressWindow -Status '正在安全关闭当前 Codex…' -Percent 6
    Stop-DreamSkinCodex -Codex $codex -AllowForce
    Start-Sleep -Milliseconds 800
    Set-DreamSkinProgressStatus -Window $progressWindow -Status 'Codex 已关闭，正在准备重新启动…' -Percent 12
  } else {
    Write-DreamSkinDesktopLaunchLog -Message 'Codex 当前未运行，进入冷启动流程。'
    $progressWindow = New-DreamSkinProgressWindow -Context $launchUiContext
  }

  $statePath = Join-Path $stateRoot 'state.json'
  Remove-DreamSkinPreviousSession -StatePath $statePath -ProgressWindow $progressWindow
  Start-DreamSkinDesktopSession -ThemePath $Theme -ProgressWindow $progressWindow

  Write-DreamSkinDesktopLaunchLog -Message '主题启动和注入验证已完成。'
  Complete-DreamSkinProgressWindow -Context $launchUiContext -Window $progressWindow
  $progressWindow = $null
  $activated = Show-DreamSkinCodexWindow -Codex $codex -TimeoutSeconds 8
  Write-DreamSkinDesktopLaunchLog -Message "Codex 主窗口前台激活结果：$activated"
} catch {
  Write-DreamSkinDesktopLaunchLog -Message "主题启动失败：$($_.Exception.Message)"
  if ($null -ne $progressWindow) {
    Close-DreamSkinProgressWindow -Window $progressWindow
  }
  Show-DreamSkinFailureDialog -Context $launchUiContext -Message $_.Exception.Message
  exit 1
}
