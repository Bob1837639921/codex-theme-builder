[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ThemePath,
  [string]$OutputDirectory = (Join-Path (Get-Location) 'dist'),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
$theme = [System.IO.Path]::GetFullPath($ThemePath)
& (Join-Path $skillRoot 'scripts\test-theme.ps1') -ThemePath $theme

$manifest = Get-Content -Raw -LiteralPath (Join-Path $theme 'theme.json') | ConvertFrom-Json
$id = if ($manifest.id -match '^[a-z0-9]+(?:-[a-z0-9]+)*$') { $manifest.id } else { Split-Path -Leaf $theme }
$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$archive = Join-Path $outputRoot "$id.zip"
if ((Test-Path -LiteralPath $archive) -and -not $Force) {
  throw "Archive already exists: $archive. Use -Force to replace it."
}
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }

Compress-Archive -LiteralPath $theme -DestinationPath $archive -CompressionLevel Optimal
Write-Host "Packaged theme: $archive"
Write-Output $archive
