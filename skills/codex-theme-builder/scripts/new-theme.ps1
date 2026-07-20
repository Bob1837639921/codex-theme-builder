[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')][string]$Id,
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$Name,
  [Parameter(Mandatory)][ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })][string]$HomeImage,
  [ValidateScript({ -not $_ -or (Test-Path -LiteralPath $_ -PathType Leaf) })][string]$ConversationImage = '',
  [ValidateScript({ -not $_ -or (Test-Path -LiteralPath $_ -PathType Leaf) })][string]$SidebarImage = '',
  [ValidateScript({ -not $_ -or (Test-Path -LiteralPath $_ -PathType Leaf) })][string]$SelectedMarkerImage = '',
  [ValidateScript({ -not $_ -or (Test-Path -LiteralPath $_ -PathType Leaf) })][string]$ComposerEdgeImage = '',
  [ValidateSet('left', 'center', 'right')][string]$ComposerEdgeHorizontal = 'left',
  [ValidateSet('top', 'center', 'bottom')][string]$ComposerEdgeVertical = 'bottom',
  [ValidateRange(48, 384)][int]$ComposerEdgeMaxHeight = 128,
  [ValidateRange(0.2, 1.0)][double]$ComposerEdgeOpacity = 0.84,
  [string]$Subtitle = 'CODEX THEME',
  [ValidatePattern('^#[0-9A-Fa-f]{6}$')][string]$Accent = '#58766c',
  [ValidatePattern('^#[0-9A-Fa-f]{6}$')][string]$AccentAlt = '#8aa69b',
  [ValidatePattern('^#[0-9A-Fa-f]{6}$')][string]$Surface = '#f4f0e6',
  [ValidatePattern('^#[0-9A-Fa-f]{6}$')][string]$Text = '#26332f',
  [string]$OutputDirectory = (Join-Path (Get-Location) 'themes'),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
$sample = Join-Path $skillRoot 'assets\themes\ink-landscape'
$templateCss = Join-Path $skillRoot 'assets\theme-template\theme.css'
$target = Join-Path ([System.IO.Path]::GetFullPath($OutputDirectory)) $Id

if ((Test-Path -LiteralPath $target) -and -not $Force) {
  throw "Theme already exists: $target. Use -Force to replace generated files."
}
New-Item -ItemType Directory -Force -Path $target | Out-Null

function Copy-ThemeImage([string]$Source, [string]$Stem) {
  $extension = [System.IO.Path]::GetExtension($Source).ToLowerInvariant()
  if ($extension -notin @('.png', '.jpg', '.jpeg', '.webp')) {
    throw "Unsupported image type: $Source"
  }
  $filename = "$Stem$extension"
  Copy-Item -LiteralPath $Source -Destination (Join-Path $target $filename) -Force
  return $filename
}

function Copy-ThemeAsset([string]$Source, [string]$Stem, [string[]]$AllowedExtensions) {
  $extension = [System.IO.Path]::GetExtension($Source).ToLowerInvariant()
  if ($extension -notin $AllowedExtensions) {
    throw "Unsupported asset type for ${Stem}: $Source"
  }
  $filename = "$Stem$extension"
  Copy-Item -LiteralPath $Source -Destination (Join-Path $target $filename) -Force
  return $filename
}

$homeName = Copy-ThemeImage -Source $HomeImage -Stem 'home'
$conversationSource = if ([string]::IsNullOrWhiteSpace($ConversationImage)) { $HomeImage } else { $ConversationImage }
$conversationName = if ([System.IO.Path]::GetFullPath($conversationSource) -eq [System.IO.Path]::GetFullPath($HomeImage)) {
  $homeName
} else {
  Copy-ThemeImage -Source $conversationSource -Stem 'conversation'
}
$sidebarName = if ([string]::IsNullOrWhiteSpace($SidebarImage)) { '' } else {
  Copy-ThemeAsset -Source $SidebarImage -Stem 'sidebar' -AllowedExtensions @('.png', '.jpg', '.jpeg', '.webp')
}
$selectedMarkerName = if ([string]::IsNullOrWhiteSpace($SelectedMarkerImage)) { '' } else {
  Copy-ThemeAsset -Source $SelectedMarkerImage -Stem 'selected-marker' -AllowedExtensions @('.png', '.webp')
}
$composerEdgeName = if ([string]::IsNullOrWhiteSpace($ComposerEdgeImage)) { '' } else {
  Copy-ThemeAsset -Source $ComposerEdgeImage -Stem 'composer-edge' -AllowedExtensions @('.png', '.webp')
}

$icons = @{}
foreach ($key in @('build', 'analyze', 'automate', 'debug')) {
  $filename = "icon-$key.svg"
  Copy-Item -LiteralPath (Join-Path $sample $filename) -Destination (Join-Path $target $filename) -Force
  $icons[$key] = $filename
}
Copy-Item -LiteralPath $templateCss -Destination (Join-Path $target 'theme.css') -Force

$manifest = [ordered]@{
  schemaVersion = 1
  id = $Id
  name = $Name
  subtitle = $Subtitle
  image = $homeName
  conversationImage = $conversationName
}
if ($sidebarName) { $manifest.sidebarImage = $sidebarName }
if ($selectedMarkerName) { $manifest.selectedLeaf = $selectedMarkerName }
if ($composerEdgeName) {
  $manifest.composerEdge = [ordered]@{
    image = $composerEdgeName
    horizontal = $ComposerEdgeHorizontal
    vertical = $ComposerEdgeVertical
    maxHeight = $ComposerEdgeMaxHeight
    opacity = $ComposerEdgeOpacity
  }
}
$manifest.icons = [ordered]@{ build = $icons.build; analyze = $icons.analyze; automate = $icons.automate; debug = $icons.debug }
$manifest.colors = [ordered]@{ accent = $Accent; accentAlt = $AccentAlt; surface = $Surface; text = $Text }
$json = $manifest | ConvertTo-Json -Depth 5
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path $target 'theme.json'), $json, $utf8)
Write-Host "Created theme: $target"
Write-Output $target
