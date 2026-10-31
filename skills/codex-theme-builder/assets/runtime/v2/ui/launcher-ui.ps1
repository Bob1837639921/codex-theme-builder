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
    [System.Drawing.Color]$Color = [System.Drawing.Color]::FromArgb(30, 41, 59)
  )
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $Text
  $label.Location = New-Object System.Drawing.Point($Left, $Top)
  $label.Size = New-Object System.Drawing.Size($Width, $Height)
  $label.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', $Size, $Style)
  $label.ForeColor = $Color
  $label.BackColor = [System.Drawing.Color]::Transparent
  $label.AutoEllipsis = $true
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
  $form.ClientSize = New-Object System.Drawing.Size(520, $Height)
  $form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.ShowInTaskbar = $true
  $form.TopMost = $false
  $form.BackColor = [System.Drawing.Color]::FromArgb(250, 251, 253)
  Set-DreamSkinFormIcon -Form $form -Context $Context
  return $form
}

function New-DreamSkinBrandMark {
  param([Parameter(Mandatory)]$Context)
  $mark = New-Object System.Windows.Forms.PictureBox
  $mark.Location = New-Object System.Drawing.Point(32, 30)
  $mark.Size = New-Object System.Drawing.Size(42, 42)
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
  $form.Controls.Add((New-DreamSkinLabel -Text '准备更新并重新启动' -Left 88 -Top 28 -Width 400 -Height 32 -Size 16 -Style Bold))
  $form.Controls.Add((New-DreamSkinLabel -Text "Codex 正在运行。先检查更新，准备好后重新打开。" -Left 88 -Top 66 -Width 400 -Height 42 -Size 9.5 -Color ([System.Drawing.Color]::FromArgb(100, 116, 139))))

  $notice = New-Object System.Windows.Forms.Panel
  $notice.Location = New-Object System.Drawing.Point(32, 124)
  $notice.Size = New-Object System.Drawing.Size(456, 66)
  $notice.BackColor = [System.Drawing.Color]::FromArgb(238, 244, 246)
  $notice.Controls.Add((New-DreamSkinLabel -Text '请先保存未发送的内容' -Left 16 -Top 10 -Width 424 -Height 22 -Size 10 -Style Bold))
  $notice.Controls.Add((New-DreamSkinLabel -Text '确认后将关闭当前 Codex，并自动重新打开。' -Left 16 -Top 34 -Width 424 -Height 20 -Size 9 -Color ([System.Drawing.Color]::FromArgb(100, 116, 139))))
  $form.Controls.Add($notice)

  $cancel = New-Object System.Windows.Forms.Button
  $cancel.Text = '取消'
  $cancel.Location = New-Object System.Drawing.Point(252, 216)
  $cancel.Size = New-Object System.Drawing.Size(88, 36)
  $cancel.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5)
  $cancel.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $cancel.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
  $cancel.BackColor = [System.Drawing.Color]::White
  $cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel

  $confirm = New-Object System.Windows.Forms.Button
  $confirm.Text = '关闭并重新启动'
  $confirm.Location = New-Object System.Drawing.Point(352, 216)
  $confirm.Size = New-Object System.Drawing.Size(136, 36)
  $confirm.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5, [System.Drawing.FontStyle]::Bold)
  $confirm.BackColor = [System.Drawing.Color]::FromArgb(15, 118, 110)
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
  $form = New-DreamSkinLaunchForm -Context $Context -Height 296
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
  $form.Add_Paint({
    $border = New-Object Drawing.Pen([Drawing.Color]::FromArgb(215, 223, 231))
    try { $_.Graphics.DrawRectangle($border, 0, 0, ($this.ClientSize.Width - 1), ($this.ClientSize.Height - 1)) } finally { $border.Dispose() }
  })
  $form.ControlBox = $false
  $form.Controls.Add((New-DreamSkinBrandMark -Context $Context))
  $title = New-DreamSkinLabel -Text "$($Context.ThemeName) · Codex" -Left 88 -Top 28 -Width 390 -Height 30 -Size 17 -Style Bold
  $subtitle = New-DreamSkinLabel -Text '主题启动器' -Left 88 -Top 62 -Width 390 -Height 22 -Size 9 -Color ([System.Drawing.Color]::FromArgb(100, 116, 139))
  $form.Controls.Add($subtitle)
  $status = New-DreamSkinLabel -Text '正在准备启动…' -Left 32 -Top 113 -Width 390 -Height 28 -Size 11
  $percent = New-DreamSkinLabel -Text '0%' -Left 426 -Top 113 -Width 62 -Height 28 -Size 12 -Style Bold -Color ([System.Drawing.Color]::FromArgb(15, 118, 110))
  $percent.TextAlign = [System.Drawing.ContentAlignment]::MiddleRight

  $progressTrack = New-Object System.Windows.Forms.Panel
  $progressTrack.Location = New-Object System.Drawing.Point(32, 151)
  $progressTrack.Size = New-Object System.Drawing.Size(456, 5)
  $progressTrack.BackColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
  $progressFill = New-Object System.Windows.Forms.Panel
  $progressFill.Location = New-Object System.Drawing.Point(0, 0)
  $progressFill.Size = New-Object System.Drawing.Size(1, 5)
  $progressFill.BackColor = [System.Drawing.Color]::FromArgb(15, 118, 110)
  $progressTrack.Controls.Add($progressFill)
  $motion = [pscustomobject]@{
    Enabled = [System.Windows.Forms.SystemInformation]::UIEffectsEnabled
    TargetWidth = 1
    FromWidth = 1
    StartedAt = 0.0
    Clock = [Diagnostics.Stopwatch]::StartNew()
  }
  $progressFill.Tag = $motion
  $progressFill.Add_Paint({
    if (-not $this.Tag.Enabled -or $this.Width -lt 8) { return }
    $width = [Math]::Max(1, $this.Width)
    $base = New-Object Drawing.Drawing2D.LinearGradientBrush(
      (New-Object Drawing.Rectangle(0, 0, $width, $this.Height)),
      [Drawing.Color]::FromArgb(15, 118, 110),
      [Drawing.Color]::FromArgb(45, 170, 155),
      [Drawing.Drawing2D.LinearGradientMode]::Horizontal)
    $glow = $null
    try {
      $_.Graphics.FillRectangle($base, 0, 0, $width, $this.Height)
      $position = [int](($this.Tag.Clock.Elapsed.TotalMilliseconds % 1800) / 1800 * ($width + 96)) - 96
      $glow = New-Object Drawing.Drawing2D.LinearGradientBrush(
        (New-Object Drawing.Rectangle($position, 0, 96, $this.Height)),
        [Drawing.Color]::Transparent, [Drawing.Color]::FromArgb(110, 220, 255, 245),
        [Drawing.Drawing2D.LinearGradientMode]::Horizontal)
      $_.Graphics.FillRectangle($glow, $position, 0, 96, $this.Height)
    } finally {
      $base.Dispose()
      if ($glow) { $glow.Dispose() }
    }
  })

  $steps = @()
  $index = 0
  foreach ($text in @('01  更新代码', '02  准备环境', '03  启动 Codex', '04  加载主题')) {
    $step = New-DreamSkinLabel -Text $text -Left (32 + 116 * $index) -Top 180 -Width 108 -Height 24 -Size 8.5 -Color ([System.Drawing.Color]::FromArgb(148, 163, 184))
    $form.Controls.Add($step)
    $steps += $step
    $index++
  }
  $hint = New-DreamSkinLabel -Text '完成后自动进入 Codex' -Left 32 -Top 242 -Width 330 -Height 22 -Size 9 -Color ([System.Drawing.Color]::FromArgb(100, 116, 139))
  $elapsed = New-DreamSkinLabel -Text '0 秒' -Left 382 -Top 242 -Width 106 -Height 22 -Size 9 -Color ([System.Drawing.Color]::FromArgb(100, 116, 139))
  $elapsed.TextAlign = [System.Drawing.ContentAlignment]::MiddleRight
  $form.Controls.Add($elapsed)
  $form.Controls.Add($title)
  $form.Controls.Add($status)
  $form.Controls.Add($percent)
  $form.Controls.Add($progressTrack)
  $form.Controls.Add($hint)
  $animationTimer = New-Object System.Windows.Forms.Timer
  $animationTimer.Interval = if ($motion.Enabled) { 33 } else { 1000 }
  $animationTimer.Add_Tick({
    if ($form.IsDisposed) { $animationTimer.Stop(); return }
    if ($motion.Enabled) {
      $t = [Math]::Min(1.0, [Math]::Max(0.0, ($motion.Clock.Elapsed.TotalMilliseconds - $motion.StartedAt) / 260.0))
      $eased = 1 - [Math]::Pow(1 - $t, 3)
      $progressFill.Width = [int][Math]::Round($motion.FromWidth + ($motion.TargetWidth - $motion.FromWidth) * $eased)
      $progressFill.Invalidate()
    }
    $elapsed.Text = "$([int]$motion.Clock.Elapsed.TotalSeconds) 秒"
  }.GetNewClosure())
  $form.Add_Disposed({ $animationTimer.Stop(); $animationTimer.Dispose() }.GetNewClosure())
  $animationTimer.Start()
  $form.Show()
  [System.Windows.Forms.Application]::DoEvents()
  return [pscustomobject]@{
    Form = $form
    Title = $title
    Status = $status
    Percent = $percent
    ProgressTrack = $progressTrack
    ProgressFill = $progressFill
    ProgressValue = 0
    Hint = $hint
    Steps = $steps
    Elapsed = $elapsed
    Clock = [Diagnostics.Stopwatch]::StartNew()
    Animation = $motion
    AnimationTimer = $animationTimer
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
  if ($Window.Status.Text -ne $Status) { $Window.Status.Text = $Status }
  if ($Percent -ge 0 -and $Percent -ne $Window.ProgressValue) {
    $nextValue = [Math]::Min(100, [Math]::Max([int]$Window.ProgressValue, $Percent))
    $Window.ProgressValue = $nextValue
    $fillWidth = [Math]::Round($Window.ProgressTrack.ClientSize.Width * ($nextValue / 100.0))
    $targetWidth = [Math]::Max(1, $fillWidth)
    if ($Window.Animation.TargetWidth -ne $targetWidth) {
      $Window.Animation.FromWidth = $Window.ProgressFill.Width
      $Window.Animation.TargetWidth = $targetWidth
      $Window.Animation.StartedAt = $Window.Animation.Clock.Elapsed.TotalMilliseconds
    }
    if (-not $Window.Animation.Enabled) { $Window.ProgressFill.Width = $targetWidth }
    $Window.Percent.Text = "$nextValue%"
    $stage = if ($nextValue -lt 14) { 0 } elseif ($nextValue -lt 35) { 1 } elseif ($nextValue -lt 75) { 2 } else { 3 }
    for ($i = 0; $i -lt $Window.Steps.Count; $i++) {
      $Window.Steps[$i].ForeColor = if ($i -le $stage) { [Drawing.Color]::FromArgb(15, 118, 110) } else { [Drawing.Color]::FromArgb(148, 163, 184) }
    }
  }
  $Window.Elapsed.Text = "$([int]$Window.Clock.Elapsed.TotalSeconds) 秒"
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
  $Window.AnimationTimer.Stop()
  $Window.ProgressFill.Width = $Window.ProgressTrack.ClientSize.Width
  $Window.Percent.Text = '100%'
  $Window.Hint.Text = '正在切换到 Codex 窗口…'
  [System.Windows.Forms.Application]::DoEvents()
  Start-Sleep -Milliseconds 160
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
  $form = New-DreamSkinLaunchForm -Context $Context -Height 360
  $form.Controls.Add((New-DreamSkinBrandMark -Context $Context))
  $form.Controls.Add((New-DreamSkinLabel -Text '启动未能完成' -Left 88 -Top 32 -Width 400 -Height 32 -Size 16 -Style Bold -Color ([System.Drawing.Color]::FromArgb(185, 59, 59))))
  $details = New-Object System.Windows.Forms.TextBox
  $details.Location = New-Object System.Drawing.Point(32, 100)
  $details.Size = New-Object System.Drawing.Size(456, 140)
  $details.Multiline = $true
  $details.ReadOnly = $true
  $details.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
  $details.BackColor = [System.Drawing.Color]::White
  $details.ForeColor = [System.Drawing.Color]::FromArgb(51, 65, 85)
  $details.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5)
  $details.Text = $Message
  $form.Controls.Add($details)
  $form.Controls.Add((New-DreamSkinLabel -Text "诊断日志：$($Context.DesktopLog)" -Left 32 -Top 252 -Width 456 -Height 36 -Size 8.3 -Color ([System.Drawing.Color]::FromArgb(100, 116, 139))))

  $close = New-Object System.Windows.Forms.Button
  $close.Text = '关闭'
  $close.Location = New-Object System.Drawing.Point(400, 300)
  $close.Size = New-Object System.Drawing.Size(88, 36)
  $close.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9.5)
  $close.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $close.FlatAppearance.BorderSize = 0
  $close.BackColor = [System.Drawing.Color]::FromArgb(15, 118, 110)
  $close.ForeColor = [System.Drawing.Color]::White
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
