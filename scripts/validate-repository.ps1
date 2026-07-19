[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$skill = Join-Path $repositoryRoot 'skills\codex-theme-builder'
$manifest = Join-Path $skill 'SKILL.md'
$agentMetadata = Join-Path $skill 'agents\openai.yaml'
$theme = Join-Path $skill 'assets\themes\ink-landscape'
$setupScript = Join-Path $PSScriptRoot 'setup-windows.ps1'
$shortcutInstaller = Join-Path $skill 'scripts\install-desktop-shortcut.ps1'

foreach ($required in @($manifest, $agentMetadata, $theme, $setupScript, $shortcutInstaller)) {
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

& (Join-Path $skill 'scripts\test-theme.ps1') -ThemePath $theme
if ($LASTEXITCODE -ne 0) {
  throw 'Bundled ink-landscape validation failed.'
}

Write-Host 'Repository validation passed.'
