[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$skill = Join-Path $repositoryRoot 'skills\codex-theme-builder'
$manifest = Join-Path $skill 'SKILL.md'
$agentMetadata = Join-Path $skill 'agents\openai.yaml'
$themesRoot = Join-Path $skill 'assets\themes'
$catalogPath = Join-Path $themesRoot 'theme-catalog.json'
$setupScript = Join-Path $PSScriptRoot 'setup-windows.ps1'
$shortcutInstaller = Join-Path $skill 'scripts\install-desktop-shortcut.ps1'

foreach ($required in @($manifest, $agentMetadata, $themesRoot, $catalogPath, $setupScript, $shortcutInstaller)) {
  if (-not (Test-Path -LiteralPath $required)) {
    throw "Required repository item is missing: $required"
  }
}

$skillText = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifest
if ($skillText -notmatch '(?s)^---\s*\r?\nname:\s*codex-theme-builder\s*\r?\ndescription:\s*.+?\r?\n---') {
  throw 'SKILL.md frontmatter is missing or invalid.'
}

$agentText = Get-Content -Raw -Encoding UTF8 -LiteralPath $agentMetadata
foreach ($key in @('display_name:', 'short_description:', 'default_prompt:')) {
  if ($agentText -notmatch [regex]::Escape($key)) {
    throw "agents/openai.yaml is missing: $key"
  }
}

$parseErrors = @()
@(
  Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1' -File
  Get-ChildItem -LiteralPath (Join-Path $skill 'scripts') -Filter '*.ps1' -File
) | ForEach-Object {
  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$errors)
  if ($errors.Count -gt 0) {
    $parseErrors += $errors | ForEach-Object { "$($_.Extent.File):$($_.Extent.StartLineNumber): $($_.Message)" }
  }
}
if ($parseErrors.Count -gt 0) {
  throw "PowerShell syntax validation failed:`n$($parseErrors -join "`n")"
}

$catalog = Get-Content -Raw -Encoding UTF8 -LiteralPath $catalogPath | ConvertFrom-Json -ErrorAction Stop
$themeIds = @($catalog.themes)
if ($catalog.schemaVersion -ne 1 -or $themeIds.Count -lt 1) {
  throw 'theme-catalog.json must use schemaVersion 1 and list at least one bundled theme.'
}
if (@($themeIds | Select-Object -Unique).Count -ne $themeIds.Count) {
  throw 'theme-catalog.json must not contain duplicate theme IDs.'
}
$expectedThemes = @('ink-landscape', 'frost-sword-immortal')
if (@($expectedThemes | Where-Object { $_ -notin $themeIds }).Count -gt 0) {
  throw "Bundled theme catalog must include: $($expectedThemes -join ', ')"
}
foreach ($themeId in $themeIds) {
  if ($themeId -notmatch '^[a-z0-9][a-z0-9-]{0,63}$') { throw "Invalid bundled theme ID: $themeId" }
  $theme = Join-Path $themesRoot $themeId
  if (-not (Test-Path -LiteralPath $theme -PathType Container)) {
    throw "Bundled theme directory is missing: $themeId"
  }
  $themeManifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $theme 'theme.json') |
    ConvertFrom-Json -ErrorAction Stop
  if ($themeManifest.id -ne $themeId) {
    throw "Bundled theme manifest ID does not match its directory: $themeId"
  }
  & (Join-Path $skill 'scripts\test-theme.ps1') -ThemePath $theme
  if ($LASTEXITCODE -ne 0) { throw "Bundled theme validation failed: $themeId" }
}

Write-Host 'Repository validation passed.'
