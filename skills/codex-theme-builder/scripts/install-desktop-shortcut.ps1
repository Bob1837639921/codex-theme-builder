[CmdletBinding()]
param(
  [string]$ThemeId = 'ink-landscape',
  [string]$LauncherName = '万象',
  [string]$ShortcutName = '',
  [string]$DesktopPath = '',
  [string]$IconPath = ''
)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $skillRoot 'assets\runtime'
. (Join-Path $runtimeRoot 'windows\scripts\common-windows.ps1')

if ($env:OS -ne 'Windows_NT') { throw '桌面快捷方式安装器仅支持 Windows。' }
$themePath = Join-Path $skillRoot "assets\themes\$ThemeId"
$manifestPath = Join-Path $themePath 'theme.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "找不到主题：$ThemeId"
}
if ([string]::IsNullOrWhiteSpace($LauncherName)) { $LauncherName = '万象' }
if ([string]::IsNullOrWhiteSpace($ShortcutName)) {
  $ShortcutName = if ($LauncherName.StartsWith('Codex ')) {
    $LauncherName
  } else {
    "Codex $LauncherName"
  }
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
  $bundledIcon = Join-Path $skillRoot 'assets\launcher-icons\codex-myriad-full.ico'
  if (-not (Test-Path -LiteralPath $bundledIcon -PathType Leaf)) {
    throw "找不到万象启动图标：$bundledIcon"
  }
  $IconPath = $bundledIcon
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
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -Theme `"$themePath`" -ThemeName `"$LauncherName`""
$shortcut.WorkingDirectory = Split-Path -Parent $launcher
$shortcut.Description = "使用$LauncherName启动 Codex"
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
  themeName = $LauncherName
  iconPath = $IconPath
  launcherPath = $launcher
  nodePath = $node.Path
  codexVersion = $codex.Version
}
