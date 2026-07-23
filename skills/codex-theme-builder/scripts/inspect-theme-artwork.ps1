[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ThemePath,
  [ValidateRange(1, 16384)][int]$RecommendedMinimumWidth = 3200
)

$ErrorActionPreference = 'Stop'
$theme = [System.IO.Path]::GetFullPath($ThemePath)
$manifestPath = Join-Path $theme 'theme.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Theme manifest not found: $manifestPath"
}

function Read-U16BigEndian([byte[]]$Bytes, [int]$Offset) {
  return ([int]$Bytes[$Offset] -shl 8) -bor [int]$Bytes[$Offset + 1]
}

function Read-U16LittleEndian([byte[]]$Bytes, [int]$Offset) {
  return [int]$Bytes[$Offset] -bor ([int]$Bytes[$Offset + 1] -shl 8)
}

function Read-U24LittleEndian([byte[]]$Bytes, [int]$Offset) {
  return [int]$Bytes[$Offset] -bor ([int]$Bytes[$Offset + 1] -shl 8) -bor ([int]$Bytes[$Offset + 2] -shl 16)
}

function Read-U32LittleEndian([byte[]]$Bytes, [int]$Offset) {
  return [BitConverter]::ToUInt32($Bytes, $Offset)
}

function Get-RasterDimensions([string]$Path) {
  [byte[]]$bytes = [System.IO.File]::ReadAllBytes($Path)
  $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()

  if ($extension -eq '.png') {
    if ($bytes.Length -lt 24) { throw "Invalid PNG: $Path" }
    $width = ([int]$bytes[16] -shl 24) -bor ([int]$bytes[17] -shl 16) -bor ([int]$bytes[18] -shl 8) -bor [int]$bytes[19]
    $height = ([int]$bytes[20] -shl 24) -bor ([int]$bytes[21] -shl 16) -bor ([int]$bytes[22] -shl 8) -bor [int]$bytes[23]
    return @($width, $height)
  }

  if ($extension -in @('.jpg', '.jpeg')) {
    if ($bytes.Length -lt 4 -or $bytes[0] -ne 0xFF -or $bytes[1] -ne 0xD8) { throw "Invalid JPEG: $Path" }
    $offset = 2
    $sofMarkers = @(0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF)
    while ($offset + 8 -lt $bytes.Length) {
      while ($offset -lt $bytes.Length -and $bytes[$offset] -ne 0xFF) { $offset++ }
      while ($offset -lt $bytes.Length -and $bytes[$offset] -eq 0xFF) { $offset++ }
      if ($offset -ge $bytes.Length) { break }
      $marker = [int]$bytes[$offset]
      $offset++
      if ($marker -in @(0x01, 0xD8, 0xD9)) { continue }
      if ($offset + 1 -ge $bytes.Length) { break }
      $segmentLength = Read-U16BigEndian $bytes $offset
      if ($sofMarkers -contains $marker) {
        return @((Read-U16BigEndian $bytes ($offset + 5)), (Read-U16BigEndian $bytes ($offset + 3)))
      }
      if ($segmentLength -lt 2) { break }
      $offset += $segmentLength
    }
    throw "JPEG dimensions not found: $Path"
  }

  if ($extension -eq '.webp') {
    if ($bytes.Length -lt 30 -or [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne 'RIFF' -or [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -ne 'WEBP') {
      throw "Invalid WebP: $Path"
    }
    $offset = 12
    while ($offset + 8 -le $bytes.Length) {
      $chunk = [Text.Encoding]::ASCII.GetString($bytes, $offset, 4)
      $chunkSize = [int](Read-U32LittleEndian $bytes ($offset + 4))
      $dataOffset = $offset + 8
      if ($chunk -eq 'VP8X' -and $dataOffset + 9 -lt $bytes.Length) {
        $width = (Read-U24LittleEndian $bytes ($dataOffset + 4)) + 1
        $height = (Read-U24LittleEndian $bytes ($dataOffset + 7)) + 1
        return @($width, $height)
      }
      if ($chunk -eq 'VP8 ' -and $dataOffset + 9 -lt $bytes.Length) {
        $width = (Read-U16LittleEndian $bytes ($dataOffset + 6)) -band 0x3FFF
        $height = (Read-U16LittleEndian $bytes ($dataOffset + 8)) -band 0x3FFF
        return @($width, $height)
      }
      if ($chunk -eq 'VP8L' -and $dataOffset + 4 -lt $bytes.Length -and $bytes[$dataOffset] -eq 0x2F) {
        $packed = [uint32](Read-U32LittleEndian $bytes ($dataOffset + 1))
        $width = ([int]($packed -band 0x3FFF)) + 1
        $height = ([int](($packed -shr 14) -band 0x3FFF)) + 1
        return @($width, $height)
      }
      $offset = $dataOffset + $chunkSize + ($chunkSize % 2)
    }
    throw "WebP dimensions not found: $Path"
  }

  throw "Unsupported full-canvas image type: $Path"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$entries = @(
  [pscustomobject]@{ Role = 'home'; File = [string]$manifest.image },
  [pscustomobject]@{ Role = 'conversation'; File = [string]$manifest.conversationImage }
)

$results = foreach ($entry in $entries) {
  $path = Join-Path $theme $entry.File
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Theme artwork not found: $path" }
  $dimensions = Get-RasterDimensions $path
  $file = Get-Item -LiteralPath $path
  $recommended = $dimensions[0] -ge $RecommendedMinimumWidth
  if (-not $recommended) {
    Write-Warning "$($entry.Role) artwork is $($dimensions[0]) px wide; $RecommendedMinimumWidth px or more is recommended for large displays: $path"
  }
  [pscustomobject]@{
    role = $entry.Role
    file = $entry.File
    width = $dimensions[0]
    height = $dimensions[1]
    bytes = $file.Length
    meetsLargeDisplayRecommendation = $recommended
  }
}

$results | ConvertTo-Json -Compress
