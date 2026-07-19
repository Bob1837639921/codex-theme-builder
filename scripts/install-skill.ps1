[CmdletBinding()]
param(
  [string]$DestinationRoot,
  [string]$BackupRoot,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repositoryRoot 'skills\codex-theme-builder'

function Copy-SkillDirectoryOverlay {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination
  )
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $Source -Force) {
    $target = Join-Path $Destination $item.Name
    if ($item.PSIsContainer) {
      Copy-SkillDirectoryOverlay -Source $item.FullName -Destination $target
    } else {
      Copy-Item -LiteralPath $item.FullName -Destination $target -Force
    }
  }
}

function Test-SkillDirectoryEqual {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination
  )
  if (-not (Test-Path -LiteralPath $Destination -PathType Container)) { return $false }
  $sourceFiles = @(Get-ChildItem -LiteralPath $Source -Recurse -File -Force)
  $destinationFiles = @(Get-ChildItem -LiteralPath $Destination -Recurse -File -Force)
  if ($sourceFiles.Count -ne $destinationFiles.Count) { return $false }
  foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($Source.Length + 1)
    $destinationFile = Join-Path $Destination $relative
    if (-not (Test-Path -LiteralPath $destinationFile -PathType Leaf)) { return $false }
    if ((Get-FileHash -LiteralPath $sourceFile.FullName).Hash -ne
      (Get-FileHash -LiteralPath $destinationFile).Hash) { return $false }
  }
  return $true
}

function Remove-SkillDirectoryStaleItems {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination
  )
  $sourcePath = [System.IO.Path]::GetFullPath($Source).TrimEnd('\')
  $destinationPath = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\')
  if ($destinationPath -eq [System.IO.Path]::GetPathRoot($destinationPath) -or
      $destinationPath -eq $sourcePath) {
    throw "Refusing unsafe Skill synchronization target: $destinationPath"
  }
  $items = @(Get-ChildItem -LiteralPath $destinationPath -Recurse -Force |
    Sort-Object { $_.FullName.Length } -Descending)
  foreach ($item in $items) {
    if (-not $item.FullName.StartsWith($destinationPath + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing stale item outside installed Skill: $($item.FullName)"
    }
    $relative = $item.FullName.Substring($destinationPath.Length + 1)
    if (-not (Test-Path -LiteralPath (Join-Path $sourcePath $relative))) {
      if ($item.PSIsContainer) { Remove-Item -LiteralPath $item.FullName -Recurse -Force }
      else { Remove-Item -LiteralPath $item.FullName -Force }
    }
  }
}

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
  if (Test-SkillDirectoryEqual -Source $source -Destination $destination) {
    Write-Host "Codex Theme Builder is already current: $destination"
    Write-Output $destination
    return
  }
  if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
    $BackupRoot = Join-Path $env:LOCALAPPDATA 'CodexThemeBuilder\skill-backups'
  }
  $backupRootPath = [System.IO.Path]::GetFullPath($BackupRoot)
  New-Item -ItemType Directory -Path $backupRootPath -Force | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $backup = Join-Path $backupRootPath "codex-theme-builder-$stamp-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
  Copy-Item -LiteralPath $destination -Destination $backup -Recurse
  Write-Host "Previous Skill backed up: $backup"
  Copy-SkillDirectoryOverlay -Source $source -Destination $destination
  Remove-SkillDirectoryStaleItems -Source $source -Destination $destination
  if (-not (Test-SkillDirectoryEqual -Source $source -Destination $destination)) {
    throw "Installed Skill does not exactly match the repository source: $destination"
  }
} else {
  Copy-Item -LiteralPath $source -Destination $destination -Recurse
}

Write-Host "Installed Codex Theme Builder: $destination"
Write-Host 'Restart Codex to refresh the available Skills.'
Write-Output $destination
