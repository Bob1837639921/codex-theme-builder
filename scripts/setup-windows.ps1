[CmdletBinding()]
param(
  [string]$ThemeId = 'ink-landscape',
  [string]$ShortcutName = '',
  [string]$DesktopPath = '',
  [string]$DestinationRoot = '',
  [string]$IconPath = ''
)

$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw '该自动配置脚本仅支持 Windows。' }

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$bundledNodeDir = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
if (Test-Path -LiteralPath (Join-Path $bundledNodeDir 'node.exe')) {
  $env:PATH = "$bundledNodeDir;$env:PATH"
}
$commonWindows = Join-Path $repositoryRoot 'skills\codex-theme-builder\assets\runtime\windows\scripts\common-windows.ps1'
. $commonWindows
$node = $null
try { $node = Get-DreamSkinNodeRuntime } catch {}
if ($null -eq $node) {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) { $winget = Get-Command winget -ErrorAction SilentlyContinue }
  if (-not $winget) {
    throw '未找到 Node.js 22+，并且系统没有 winget，AI 无法自动补齐 Node.js 依赖。'
  }
  Write-Host '未检测到 Node.js 22+，正在自动安装 Node.js LTS……'
  & $winget.Source install --id OpenJS.NodeJS.LTS --exact --source winget `
    --accept-package-agreements --accept-source-agreements --silent
  if ($LASTEXITCODE -ne 0) { throw "Node.js LTS 自动安装失败，winget 退出码：$LASTEXITCODE" }
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:PATH = "$userPath;$machinePath"
  $node = Get-DreamSkinNodeRuntime
}
if (-not ($env:PATH -split ';' | Where-Object { Test-DreamSkinPathEqual -Left $_ -Right (Split-Path -Parent $node.Path) })) {
  $env:PATH = "$(Split-Path -Parent $node.Path);$env:PATH"
}
Write-Host "Node.js 运行环境已就绪：$($node.Version)"

Write-Host '[1/4] 正在验证项目和内置主题……'
& (Join-Path $PSScriptRoot 'validate-repository.ps1')

Write-Host '[2/4] 正在安装或更新 Codex Theme Builder skill……'
$installArguments = @{ Force = $true }
if (-not [string]::IsNullOrWhiteSpace($DestinationRoot)) {
  $installArguments.DestinationRoot = $DestinationRoot
}
$installedSkill = & (Join-Path $PSScriptRoot 'install-skill.ps1') @installArguments | Select-Object -Last 1
$installedSkill = [System.IO.Path]::GetFullPath("$installedSkill")

Write-Host '[3/4] 正在创建隐藏窗口桌面快捷方式和主题图标……'
$shortcutArguments = @{ ThemeId = $ThemeId }
if (-not [string]::IsNullOrWhiteSpace($ShortcutName)) { $shortcutArguments.ShortcutName = $ShortcutName }
if (-not [string]::IsNullOrWhiteSpace($DesktopPath)) { $shortcutArguments.DesktopPath = $DesktopPath }
if (-not [string]::IsNullOrWhiteSpace($IconPath)) { $shortcutArguments.IconPath = $IconPath }
$result = & (Join-Path $installedSkill 'scripts\install-desktop-shortcut.ps1') @shortcutArguments

Write-Host '[4/4] 正在进行安装结果核验……'
if (-not $result.pass -or -not (Test-Path -LiteralPath $result.shortcutPath -PathType Leaf)) {
  throw '自动配置未能生成通过验证的桌面快捷方式。'
}

Write-Host ''
Write-Host '配置已经全部完成。'
Write-Host "请保存当前内容并完全退出 Codex，然后在桌面双击「$($result.shortcutName)」启动。"
$result
