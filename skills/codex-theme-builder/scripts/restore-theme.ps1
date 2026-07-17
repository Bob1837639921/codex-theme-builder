[CmdletBinding()]
param([switch]$RestartCodex)

$ErrorActionPreference = 'Stop'
$skillRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $skillRoot 'assets\runtime\v2\restore.ps1') -RestartCodex:$RestartCodex
exit $LASTEXITCODE
