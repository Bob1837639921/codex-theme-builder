$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\..\windows\scripts\common-windows.ps1')
function Assert-PortCase { param([bool]$Condition, [string]$Message) if (-not $Condition) { throw $Message } }
# Isolate listener discovery so the real exclusive bind must reject occupied ports.
function Get-DreamSkinPortListeners { param($Port) return @() }
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Server.ExclusiveAddressUse = $true
$listener.Start()
$port = $listener.LocalEndpoint.Port
try {
  Assert-PortCase (-not (Test-DreamSkinPortAvailable -Port $port)) 'An occupied port must fail even when listener discovery returns nothing.'
} finally { $listener.Stop() }
Assert-PortCase (Test-DreamSkinPortAvailable -Port $port) 'A released bindable loopback port must pass.'
# A second bind proves that the successful availability probe released its socket.
$listener.Start()
$listener.Stop()
Assert-PortCase (-not (Test-DreamSkinPortAvailable -Port 0)) 'Port zero must not be selected.'
Assert-PortCase (-not (Test-DreamSkinPortAvailable -Port 65536)) 'Out-of-range ports must fail.'
# Exercise this machine's existing exclusions without adding or changing any range.
$checked = 0
foreach ($line in (& netsh.exe interface ipv4 show excludedportrange protocol=tcp)) {
  # Administered (*) reservations can permit binds; dynamic exclusions deny them.
  if ($line -match '\*') { continue }
  if ($line -notmatch '^\s*(\d+)\s+(\d+)\s*\*?\s*$') { continue }
  $excluded = [int]$Matches[1]
  if ($excluded -lt 49152) { continue }
  Assert-PortCase (-not (Test-DreamSkinPortAvailable -Port $excluded)) "Windows excluded port $excluded must fail."
  $checked++
}
Write-Host "PASS: exclusive loopback port allocation, cleanup and $checked Windows excluded ranges."
