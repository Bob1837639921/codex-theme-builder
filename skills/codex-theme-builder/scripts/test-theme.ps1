[CmdletBinding()]
param([Parameter(Mandatory)][string]$ThemePath)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $skillRoot 'assets\runtime'
$runtime = Join-Path $runtimeRoot 'v2'
$theme = [System.IO.Path]::GetFullPath($ThemePath)

if (-not (Test-Path -LiteralPath (Join-Path $theme 'theme.json') -PathType Leaf)) {
  throw "Theme manifest not found: $theme"
}
. (Join-Path $runtimeRoot 'windows\scripts\common-windows.ps1')
$node = Get-DreamSkinNodeRuntime

& $node.Path --check (Join-Path $runtime 'scripts\injector.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Injector JavaScript syntax check failed.' }
& $node.Path (Join-Path $runtime 'scripts\injector.mjs') --self-test
if ($LASTEXITCODE -ne 0) { throw 'CDP safety self-test failed.' }
& $node.Path (Join-Path $runtime 'scripts\injector.mjs') --check-payload --theme-dir $theme
if ($LASTEXITCODE -ne 0) { throw 'Theme payload validation failed.' }
& (Join-Path $PSScriptRoot 'inspect-theme-artwork.ps1') -ThemePath $theme
if ($LASTEXITCODE -ne 0) { throw 'Theme artwork inspection failed.' }

Write-Host "Theme validation passed: $theme"
