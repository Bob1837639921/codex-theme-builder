[CmdletBinding()]
param(
  [string]$DestinationRoot,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repositoryRoot 'skills\codex-theme-builder'

if (-not (Test-Path -LiteralPath (Join-Path $source 'SKILL.md') -PathType Leaf)) {
  throw "Codex Theme Builder Skill was not found: $source"
}

if ([string]::IsNullOrWhiteSpace($DestinationRoot)) {
  $codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
  $DestinationRoot = Join-Path $codexHome 'skills'
}

$destinationRootPath = [System.IO.Path]::GetFullPath($DestinationRoot)
$destination = Join-Path $destinationRootPath 'codex-theme-builder'
New-Item -ItemType Directory -Path $destinationRootPath -Force | Out-Null

if (Test-Path -LiteralPath $destination) {
  if (-not $Force) {
    throw "Skill already exists: $destination. Rerun with -Force to back it up and install this version."
  }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backup = Join-Path $destinationRootPath "codex-theme-builder.backup-$stamp"
  Move-Item -LiteralPath $destination -Destination $backup
  Write-Host "Previous Skill backed up: $backup"
}

Copy-Item -LiteralPath $source -Destination $destination -Recurse
Write-Host "Installed Codex Theme Builder: $destination"
Write-Host 'Restart Codex to refresh the available Skills.'
Write-Output $destination
