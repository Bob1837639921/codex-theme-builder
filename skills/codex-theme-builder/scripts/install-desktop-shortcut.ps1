[CmdletBinding()]
param(
  [string]$ThemeId = 'ink-landscape',
  [string]$ShortcutName = '',
  [string]$DesktopPath = '',
  [string]$IconPath = ''
)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $skillRoot 'assets\runtime'
. (Join-Path $runtimeRoot 'windows\scripts\common-windows.ps1')

function Read-ThemeManifest {
  param([Parameter(Mandatory)][string]$Path)
  $utf8 = [System.Text.UTF8Encoding]::new($false, $true)
  try {
    $text = [System.IO.File]::ReadAllText($Path, $utf8)
    return $text | ConvertFrom-Json -ErrorAction Stop
  } catch {
    throw "无法读取主题清单：$Path"
  }
}

function New-ThemeLauncherIcon {
  param(
    [Parameter(Mandatory)][string]$Path,
    [string]$Accent = '#5E7770',
    [string]$Surface = '#F4F0E7',
    [string]$Text = '#272A29'
  )
  Add-Type -AssemblyName System.Drawing
  $directory = Split-Path -Parent $Path
  New-Item -ItemType Directory -Path $directory -Force | Out-Null

  $bitmap = [System.Drawing.Bitmap]::new(
    256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $surfaceColor = [System.Drawing.ColorTranslator]::FromHtml($Surface)
  $accentColor = [System.Drawing.ColorTranslator]::FromHtml($Accent)
  $textColor = [System.Drawing.ColorTranslator]::FromHtml($Text)
  $frame = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $frame.AddArc(8, 8, 48, 48, 180, 90)
  $frame.AddArc(200, 8, 48, 48, 270, 90)
  $frame.AddArc(200, 200, 48, 48, 0, 90)
  $frame.AddArc(8, 200, 48, 48, 90, 90)
  $frame.CloseFigure()
  $surfaceBrush = [System.Drawing.SolidBrush]::new($surfaceColor)
  $graphics.FillPath($surfaceBrush, $frame)

  $moonBrush = [System.Drawing.SolidBrush]::new(
    [System.Drawing.Color]::FromArgb(190, $accentColor))
  $graphics.FillEllipse($moonBrush, 166, 34, 46, 46)

  $farColor = [System.Drawing.Color]::FromArgb(115, $accentColor)
  $farBrush = [System.Drawing.SolidBrush]::new($farColor)
  $farMountain = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $farMountain.AddPolygon([System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(18, 202),
    [System.Drawing.Point]::new(82, 112),
    [System.Drawing.Point]::new(118, 160),
    [System.Drawing.Point]::new(160, 92),
    [System.Drawing.Point]::new(238, 202)
  ))
  $graphics.FillPath($farBrush, $farMountain)

  $inkBrush = [System.Drawing.SolidBrush]::new($textColor)
  $nearMountain = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $nearMountain.AddPolygon([System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(12, 218),
    [System.Drawing.Point]::new(72, 152),
    [System.Drawing.Point]::new(104, 184),
    [System.Drawing.Point]::new(142, 132),
    [System.Drawing.Point]::new(178, 174),
    [System.Drawing.Point]::new(214, 142),
    [System.Drawing.Point]::new(246, 218)
  ))
  $graphics.FillPath($inkBrush, $nearMountain)

  $mistPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(145, $surfaceColor), 5)
  $graphics.DrawBezier($mistPen, 26, 188, 82, 168, 126, 210, 224, 174)

  $pngStream = [System.IO.MemoryStream]::new()
  $bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBytes = $pngStream.ToArray()
  $fileStream = [System.IO.File]::Open(
    $Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write,
    [System.IO.FileShare]::None)
  $writer = [System.IO.BinaryWriter]::new($fileStream)
  try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]1)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]32)
    $writer.Write([uint32]$pngBytes.Length)
    $writer.Write([uint32]22)
    $writer.Write($pngBytes)
  } finally {
    $writer.Dispose()
    $pngStream.Dispose()
    $mistPen.Dispose()
    $inkBrush.Dispose()
    $nearMountain.Dispose()
    $farBrush.Dispose()
    $farMountain.Dispose()
    $moonBrush.Dispose()
    $surfaceBrush.Dispose()
    $frame.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
  $icon = [System.Drawing.Icon]::new($Path)
  $icon.Dispose()
}

if ($env:OS -ne 'Windows_NT') { throw '桌面快捷方式安装器仅支持 Windows。' }
$themePath = Join-Path $skillRoot "assets\themes\$ThemeId"
$manifestPath = Join-Path $themePath 'theme.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "找不到主题：$ThemeId"
}
$manifest = Read-ThemeManifest -Path $manifestPath
$displayName = if ($manifest.name) { "$($manifest.name)" } else { $ThemeId }
$launcherThemeName = if ($displayName.EndsWith('主题')) { $displayName } else { "${displayName}主题" }
if ([string]::IsNullOrWhiteSpace($ShortcutName)) {
  $ShortcutName = "Codex $launcherThemeName"
}
if ([string]::IsNullOrWhiteSpace($DesktopPath)) {
  $DesktopPath = [Environment]::GetFolderPath('Desktop')
}
$DesktopPath = [System.IO.Path]::GetFullPath($DesktopPath)
New-Item -ItemType Directory -Path $DesktopPath -Force | Out-Null

$bundledNodeDir = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
if (Test-Path -LiteralPath (Join-Path $bundledNodeDir 'node.exe')) {
  $env:PATH = "$bundledNodeDir;$env:PATH"
}
$node = Get-DreamSkinNodeRuntime
$codex = Get-DreamSkinCodexInstall
$launcher = Join-Path $runtimeRoot 'v2\desktop-launch.ps1'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
foreach ($required in @($launcher, $powershell)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "缺少快捷启动依赖：$required"
  }
}

if ([string]::IsNullOrWhiteSpace($IconPath)) {
  $iconRoot = Join-Path $env:LOCALAPPDATA 'CodexThemeBuilder\icons'
  $IconPath = Join-Path $iconRoot "$ThemeId.ico"
  $accent = if ($manifest.colors.accent) { "$($manifest.colors.accent)" } else { '#5E7770' }
  $surface = if ($manifest.colors.surface) { "$($manifest.colors.surface)" } else { '#F4F0E7' }
  $text = if ($manifest.colors.text) { "$($manifest.colors.text)" } else { '#272A29' }
  New-ThemeLauncherIcon -Path $IconPath -Accent $accent -Surface $surface -Text $text
} else {
  $IconPath = [System.IO.Path]::GetFullPath($IconPath)
  if (-not (Test-Path -LiteralPath $IconPath -PathType Leaf)) {
    throw "找不到快捷方式图标：$IconPath"
  }
}

$shortcutPath = Join-Path $DesktopPath "$ShortcutName.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershell
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -Theme `"$themePath`" -ThemeName `"$launcherThemeName`""
$shortcut.WorkingDirectory = Split-Path -Parent $launcher
$shortcut.Description = "使用$launcherThemeName启动 Codex"
$shortcut.WindowStyle = 7
$shortcut.IconLocation = "$IconPath,0"
$shortcut.Save()

$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ine $powershell -or
  $verified.Arguments -notmatch [regex]::Escape($launcher) -or
  $verified.Arguments -notmatch [regex]::Escape($themePath) -or
  $verified.IconLocation -notmatch [regex]::Escape($IconPath)) {
  throw '桌面快捷方式验证失败。'
}

[pscustomobject]@{
  pass = $true
  shortcutPath = $shortcutPath
  shortcutName = $ShortcutName
  themeId = $ThemeId
  themeName = $launcherThemeName
  iconPath = $IconPath
  launcherPath = $launcher
  nodePath = $node.Path
  codexVersion = $codex.Version
}
