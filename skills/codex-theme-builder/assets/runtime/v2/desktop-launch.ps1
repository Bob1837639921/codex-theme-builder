[CmdletBinding()]
param(
  [string]$Theme = '',
  [string]$ThemeName = '万象'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $RepoRoot 'windows\scripts\common-windows.ps1')

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
$launcherIcon = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\launcher-icons\codex-myriad-full.ico'))

function Write-DreamSkinDesktopLaunchLog {
  param([Parameter(Mandatory)][string]$Message)
  try {
    New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
    Add-Content -LiteralPath $desktopLog -Encoding UTF8 `
      -Value "[$((Get-Date).ToString('o'))] $Message"
  } catch {}
}

function Initialize-DreamSkinLaunchUi {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  [System.Windows.Forms.Application]::EnableVisualStyles()
}

function Set-DreamSkinFormIcon {
  param([Parameter(Mandatory)][System.Windows.Forms.Form]$Form)
  if (-not (Test-Path -LiteralPath $launcherIcon)) { return }
  try {
    $icon = New-Object System.Drawing.Icon($launcherIcon)
    $Form.Icon = $icon
    $Form.Tag = $icon
    $Form.Add_FormClosed({ if ($null -ne $this.Tag) { $this.Tag.Dispose() } })
  } catch {}
}

function New-DreamSkinLabel {
  param(
    [Parameter(Mandatory)][string]$Text,
    [Parameter(Mandatory)][int]$Left,
    [Parameter(Mandatory)][int]$Top,
    [Parameter(Mandatory)][int]$Width,
    [Parameter(Mandatory)][int]$Height,
    [float]$Size = 10,
    [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular,
    [System.Drawing.Color]$Color = [System.Drawing.Color]::FromArgb(48, 54, 60)
  )
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $Text
  $label.Location = New-Object System.Drawing.Point($Left, $Top)
  $label.Size = New-Object System.Drawing.Size($Width, $Height)
  $label.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', $Size, $Style)
  $label.ForeColor = $Color
  $label.BackColor = [System.Drawing.Color]::Transparent
  return $label
}

function New-DreamSkinLaunchForm {
  param([int]$Height = 270)
  Initialize-DreamSkinLaunchUi
  $form = New-Object System.Windows.Forms.Form
  $form.Text = "Codex $ThemeName"
  $form.ClientSize = New-Object System.Drawing.Size(460, $Height)
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.ShowInTaskbar = $true
  $form.TopMost = $true
  $form.BackColor = [System.Drawing.Color]::FromArgb(249, 247, 242)
  Set-DreamSkinFormIcon -Form $form
  return $form
}

function New-DreamSkinBrandMark {
  $mark = New-Object System.Windows.Forms.PictureBox
  $mark.Location = New-Object System.Drawing.Point(28, 24)
  $mark.Size = New-Object System.Drawing.Size(52, 52)
  $mark.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
  if (Test-Path -LiteralPath $launcherIcon) {
    try {
      $mark.Image = [System.Drawing.Image]::FromFile($launcherIcon)
      $mark.Tag = $mark.Image
      $mark.Add_Disposed({ if ($null -ne $this.Tag) { $this.Tag.Dispose() } })
    } catch {}
  }
  return $mark
}

function Show-DreamSkinRestartDialog {
  $form = New-DreamSkinLaunchForm -Height 282
  $form.Controls.Add((New-DreamSkinBrandMark))
  $form.Controls.Add((New-DreamSkinLabel -Text '重新启动并加载主题？' -Left 96 -Top 26 -Width 330 -Height 32 -Size 15 -Style Bold))
  $form.Controls.Add((New-DreamSkinLabel -Text "Codex 正在运行。$ThemeName 需要重新启动 Codex，才能安全加载主题系统。" -Left 96 -Top 60 -Width 330 -Height 48 -Size 9.5 -Color ([System.Drawing.Color]::FromArgb(96, 99, 103))))

  $notice = New-Object System.Windows.Forms.Panel
  $notice.Location = New-Object System.Drawing.Point(28, 124)
  $notice.Size = New-Object System.Drawing.Size(404, 66)
  $notice.BackColor = [System.Drawing.Color]::FromArgb(243, 237, 225)
  $notice.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
  $notice.Controls.Add((New-DreamSkinLabel -Text '请先保存未发送的内容' -Left 16 -Top 10 -Width 360 -Height 22 -Size 10 -Style Bold -Color ([System.Drawing.Color]::FromArgb(102, 79, 42))))
  $notice.Controls.Add((New-DreamSkinLabel -Text '确认后将关闭当前 Codex，并自动重新打开。' -Left 16 -Top 34 -Width 360 -Height 20 -Size 9 -Color ([System.Drawing.Color]::FromArgb(118, 101, 76))))
  $form.Controls.Add($notice)

  $cancel = New-Object System.Windows.Forms.Button
  $cancel.Text = '取消'
  $cancel.Location = New-Object System.Drawing.Point(204, 214)
  $cancel.Size = New-Object System.Drawing.Size(88, 36)
  $cancel.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5)
  $cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel

  $confirm = New-Object System.Windows.Forms.Button
  $confirm.Text = '关闭并重新启动'
  $confirm.Location = New-Object System.Drawing.Point(300, 214)
  $confirm.Size = New-Object System.Drawing.Size(132, 36)
  $confirm.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5, [System.Drawing.FontStyle]::Bold)
  $confirm.BackColor = [System.Drawing.Color]::FromArgb(66, 105, 96)
  $confirm.ForeColor = [System.Drawing.Color]::White
  $confirm.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $confirm.FlatAppearance.BorderSize = 0
  $confirm.DialogResult = [System.Windows.Forms.DialogResult]::OK

  $form.AcceptButton = $confirm
  $form.CancelButton = $cancel
  $form.Controls.Add($cancel)
  $form.Controls.Add($confirm)
  try {
    return $form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK
  } finally {
    $form.Dispose()
  }
}

function New-DreamSkinProgressWindow {
  $form = New-DreamSkinLaunchForm -Height 206
  $form.ControlBox = $false
  $form.Controls.Add((New-DreamSkinBrandMark))
  $title = New-DreamSkinLabel -Text "正在启动 $ThemeName" -Left 96 -Top 28 -Width 330 -Height 30 -Size 15 -Style Bold
  $status = New-DreamSkinLabel -Text '正在准备主题运行环境…' -Left 96 -Top 64 -Width 330 -Height 24 -Size 9.5 -Color ([System.Drawing.Color]::FromArgb(96, 99, 103))
  $percent = New-DreamSkinLabel -Text '4%' -Left 374 -Top 94 -Width 58 -Height 20 -Size 9 -Style Bold -Color ([System.Drawing.Color]::FromArgb(66, 105, 96))
  $percent.TextAlign = [System.Drawing.ContentAlignment]::MiddleRight
  $progressTrack = New-Object System.Windows.Forms.Panel
  $progressTrack.Location = New-Object System.Drawing.Point(28, 118)
  $progressTrack.Size = New-Object System.Drawing.Size(404, 8)
  $progressTrack.BackColor = [System.Drawing.Color]::FromArgb(224, 222, 216)
  $progressFill = New-Object System.Windows.Forms.Panel
  $progressFill.Location = New-Object System.Drawing.Point(0, 0)
  $progressFill.Size = New-Object System.Drawing.Size(16, 8)
  $progressFill.BackColor = [System.Drawing.Color]::FromArgb(66, 105, 96)
  $progressTrack.Controls.Add($progressFill)
  $hint = New-DreamSkinLabel -Text '请稍候，启动期间无需再次操作。' -Left 28 -Top 144 -Width 404 -Height 22 -Size 8.8 -Color ([System.Drawing.Color]::FromArgb(125, 127, 130))
  $form.Controls.Add($title)
  $form.Controls.Add($status)
  $form.Controls.Add($percent)
  $form.Controls.Add($progressTrack)
  $form.Controls.Add($hint)
  $form.Show()
  [System.Windows.Forms.Application]::DoEvents()
  return [pscustomobject]@{
    Form = $form
    Title = $title
    Status = $status
    Percent = $percent
    ProgressTrack = $progressTrack
    ProgressFill = $progressFill
    ProgressValue = 4
    Hint = $hint
  }
}

function Set-DreamSkinProgressStatus {
  param(
    [Parameter(Mandatory)]$Window,
    [Parameter(Mandatory)][string]$Status,
    [string]$Title = '',
    [int]$Percent = -1
  )
  if (-not [string]::IsNullOrWhiteSpace($Title)) { $Window.Title.Text = $Title }
  $Window.Status.Text = $Status
  if ($Percent -ge 0) {
    $nextValue = [Math]::Min(100, [Math]::Max([int]$Window.ProgressValue, $Percent))
    $Window.ProgressValue = $nextValue
    $fillWidth = [Math]::Round($Window.ProgressTrack.ClientSize.Width * ($nextValue / 100.0))
    $Window.ProgressFill.Width = [Math]::Max(1, $fillWidth)
    $Window.Percent.Text = "$nextValue%"
  }
  [System.Windows.Forms.Application]::DoEvents()
}

function Complete-DreamSkinProgressWindow {
  param([Parameter(Mandatory)]$Window)
  $Window.Title.Text = "$ThemeName 已准备就绪"
  $Window.Title.ForeColor = [System.Drawing.Color]::FromArgb(54, 112, 91)
  $Window.Status.Text = '主题已加载，Codex 即将显示。'
  $Window.Status.ForeColor = [System.Drawing.Color]::FromArgb(70, 91, 82)
  $Window.ProgressValue = 100
  $Window.ProgressFill.Width = $Window.ProgressTrack.ClientSize.Width
  $Window.Percent.Text = '100%'
  $Window.Hint.Text = '正在切换到 Codex 窗口…'
  [System.Windows.Forms.Application]::DoEvents()
  Start-Sleep -Milliseconds 850
  $Window.Form.Close()
  $Window.Form.Dispose()
}

function Show-DreamSkinFailureDialog {
  param([Parameter(Mandatory)][string]$Message)
  $form = New-DreamSkinLaunchForm -Height 292
  $form.Controls.Add((New-DreamSkinBrandMark))
  $form.Controls.Add((New-DreamSkinLabel -Text "$ThemeName 启动失败" -Left 96 -Top 28 -Width 330 -Height 30 -Size 15 -Style Bold -Color ([System.Drawing.Color]::FromArgb(160, 57, 57))))
  $detail = New-DreamSkinLabel -Text $Message -Left 28 -Top 96 -Width 404 -Height 76 -Size 9.2 -Color ([System.Drawing.Color]::FromArgb(74, 78, 83))
  $form.Controls.Add($detail)
  $form.Controls.Add((New-DreamSkinLabel -Text "诊断日志：$desktopLog" -Left 28 -Top 180 -Width 404 -Height 32 -Size 8.3 -Color ([System.Drawing.Color]::FromArgb(120, 122, 126))))
  $close = New-Object System.Windows.Forms.Button
  $close.Text = '关闭'
  $close.Location = New-Object System.Drawing.Point(344, 228)
  $close.Size = New-Object System.Drawing.Size(88, 36)
  $close.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5)
  $close.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.AcceptButton = $close
  $form.CancelButton = $close
  $form.Controls.Add($close)
  try {
    [void]$form.ShowDialog()
  } finally {
    $form.Dispose()
  }
}

$progressWindow = $null
try {
  Write-DreamSkinDesktopLaunchLog -Message "桌面快捷启动已触发。主题：$ThemeName；路径：$Theme"
  $codex = Get-DreamSkinCodexInstall
  $codexProcesses = @(Get-DreamSkinCodexProcesses -Codex $codex)
  if ($codexProcesses.Count -gt 0) {
    Write-DreamSkinDesktopLaunchLog -Message "检测到 $($codexProcesses.Count) 个 Codex 进程，等待用户确认重启。"
    if (-not (Show-DreamSkinRestartDialog)) {
      Write-DreamSkinDesktopLaunchLog -Message '用户取消了主题重启。'
      exit 0
    }
    $progressWindow = New-DreamSkinProgressWindow
    Set-DreamSkinProgressStatus -Window $progressWindow -Status '正在安全关闭当前 Codex…' -Percent 6
    Stop-DreamSkinCodex -Codex $codex -AllowForce
    Start-Sleep -Milliseconds 800
    Set-DreamSkinProgressStatus -Window $progressWindow -Status 'Codex 已关闭，正在准备重新启动…' -Percent 12
  } else {
    Write-DreamSkinDesktopLaunchLog -Message 'Codex 当前未运行，进入冷启动流程。'
    $progressWindow = New-DreamSkinProgressWindow
  }

  $statePath = Join-Path $stateRoot 'state.json'
  if (Test-Path -LiteralPath $statePath) {
    Set-DreamSkinProgressStatus -Window $progressWindow -Status '正在清理上一次主题会话…' -Percent 14
    Write-DreamSkinDesktopLaunchLog -Message '正在检查并清理上一次主题会话状态。'
    $state = Read-DreamSkinState -Path $statePath
    if ($null -ne $state) {
      [void](Stop-DreamSkinRecordedInjector -State $state)
    }
    Remove-Item -LiteralPath $statePath -Force
  }

  Set-DreamSkinProgressStatus -Window $progressWindow -Status '正在启动 Codex 并加载主题资源…' -Percent 18
  $progressCallback = {
    param([int]$Percent, [string]$Status)
    Set-DreamSkinProgressStatus -Window $progressWindow -Status $Status -Percent $Percent
  }
  & (Join-Path $PSScriptRoot 'launch.ps1') -Theme $Theme -ProgressCallback $progressCallback | Out-Null
  Write-DreamSkinDesktopLaunchLog -Message '主题启动和注入验证已完成。'
  Complete-DreamSkinProgressWindow -Window $progressWindow
  $progressWindow = $null
  $activated = Show-DreamSkinCodexWindow -Codex $codex -TimeoutSeconds 8
  Write-DreamSkinDesktopLaunchLog -Message "Codex 主窗口前台激活结果：$activated"
} catch {
  Write-DreamSkinDesktopLaunchLog -Message "主题启动失败：$($_.Exception.Message)"
  if ($null -ne $progressWindow -and -not $progressWindow.Form.IsDisposed) {
    $progressWindow.Form.Close()
    $progressWindow.Form.Dispose()
  }
  Show-DreamSkinFailureDialog -Message $_.Exception.Message
  exit 1
}
