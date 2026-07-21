[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Initialize-DreamSkinLaunchUi {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  [System.Windows.Forms.Application]::EnableVisualStyles()
}

function Set-DreamSkinFormIcon {
  param(
    [Parameter(Mandatory)][System.Windows.Forms.Form]$Form,
    [Parameter(Mandatory)]$Context
  )
  if (-not (Test-Path -LiteralPath $Context.LauncherIcon)) { return }
  try {
    $icon = New-Object System.Drawing.Icon($Context.LauncherIcon)
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
  param(
    [Parameter(Mandatory)]$Context,
    [int]$Height = 270
  )
  Initialize-DreamSkinLaunchUi
  $form = New-Object System.Windows.Forms.Form
  $form.Text = "Codex $($Context.ThemeName)"
  $form.ClientSize = New-Object System.Drawing.Size(460, $Height)
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.ShowInTaskbar = $true
  $form.TopMost = $true
  $form.BackColor = [System.Drawing.Color]::FromArgb(249, 247, 242)
  Set-DreamSkinFormIcon -Form $form -Context $Context
  return $form
}

function New-DreamSkinBrandMark {
  param([Parameter(Mandatory)]$Context)
  $mark = New-Object System.Windows.Forms.PictureBox
  $mark.Location = New-Object System.Drawing.Point(28, 24)
  $mark.Size = New-Object System.Drawing.Size(52, 52)
  $mark.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
  if (Test-Path -LiteralPath $Context.LauncherIcon) {
    try {
      $mark.Image = [System.Drawing.Image]::FromFile($Context.LauncherIcon)
      $mark.Tag = $mark.Image
      $mark.Add_Disposed({ if ($null -ne $this.Tag) { $this.Tag.Dispose() } })
    } catch {}
  }
  return $mark
}

function Show-DreamSkinRestartDialog {
  param([Parameter(Mandatory)]$Context)
  $form = New-DreamSkinLaunchForm -Context $Context -Height 282
  $form.Controls.Add((New-DreamSkinBrandMark -Context $Context))
  $form.Controls.Add((New-DreamSkinLabel -Text '重新启动并加载主题？' -Left 96 -Top 26 -Width 330 -Height 32 -Size 15 -Style Bold))
  $form.Controls.Add((New-DreamSkinLabel -Text "Codex 正在运行。$($Context.ThemeName) 需要重新启动 Codex，才能安全加载主题系统。" -Left 96 -Top 60 -Width 330 -Height 48 -Size 9.5 -Color ([System.Drawing.Color]::FromArgb(96, 99, 103))))

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
  param([Parameter(Mandatory)]$Context)
  $form = New-DreamSkinLaunchForm -Context $Context -Height 206
  $form.ControlBox = $false
  $form.Controls.Add((New-DreamSkinBrandMark -Context $Context))
  $title = New-DreamSkinLabel -Text "正在启动 $($Context.ThemeName)" -Left 96 -Top 28 -Width 330 -Height 30 -Size 15 -Style Bold
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
  param(
    [Parameter(Mandatory)]$Context,
    [Parameter(Mandatory)]$Window
  )
  $Window.Title.Text = "$($Context.ThemeName) 已准备就绪"
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

function Close-DreamSkinProgressWindow {
  param([Parameter(Mandatory)]$Window)
  if ($null -eq $Window -or $Window.Form.IsDisposed) { return }
  $Window.Form.Close()
  $Window.Form.Dispose()
}

function Show-DreamSkinFailureDialog {
  param(
    [Parameter(Mandatory)]$Context,
    [Parameter(Mandatory)][string]$Message
  )
  $form = New-DreamSkinLaunchForm -Context $Context -Height 292
  $form.Controls.Add((New-DreamSkinBrandMark -Context $Context))
  $form.Controls.Add((New-DreamSkinLabel -Text "$($Context.ThemeName) 启动失败" -Left 96 -Top 28 -Width 330 -Height 30 -Size 15 -Style Bold -Color ([System.Drawing.Color]::FromArgb(160, 57, 57))))
  $form.Controls.Add((New-DreamSkinLabel -Text $Message -Left 28 -Top 96 -Width 404 -Height 76 -Size 9.2 -Color ([System.Drawing.Color]::FromArgb(74, 78, 83))))
  $form.Controls.Add((New-DreamSkinLabel -Text "诊断日志：$($Context.DesktopLog)" -Left 28 -Top 180 -Width 404 -Height 32 -Size 8.3 -Color ([System.Drawing.Color]::FromArgb(120, 122, 126))))

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
