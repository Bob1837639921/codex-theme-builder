param([Parameter(Mandatory)][string]$NodePath)
$ErrorActionPreference = 'Stop'
$common = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\windows\scripts\common-windows.ps1'))
$tempRoot = Join-Path $env:TEMP ('dream detached ' + [guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $tempRoot)
$fixture = Join-Path $tempRoot 'service fixture.mjs'
$pidFile = Join-Path $tempRoot 'pid.txt'
$heartbeat = Join-Path $tempRoot 'heartbeat.txt'
$parentFile = Join-Path $tempRoot 'parent.ps1'
$service = $null
$parent = $null
try {
  [IO.File]::WriteAllText($fixture, @'
import fs from 'node:fs';
const args=process.argv.slice(2);
if(args[0]!=='value with spaces'||args[1]!=='--log-directory')process.exit(7);
setInterval(()=>fs.writeFileSync(args[2]+'/heartbeat.txt',String(Date.now())),100);
'@)
  $quote = { param($value) "'" + $value.Replace("'", "''") + "'" }
  $parentText = ". $(& $quote $common)`n" +
    "`$service = Start-DreamSkinDetachedInjector -NodePath $(& $quote $NodePath) -InjectorPath $(& $quote $fixture) -Arguments @('value with spaces') -LogDirectory $(& $quote $tempRoot)`n" +
    "[IO.File]::WriteAllText($(& $quote $pidFile), [string]`$service.Id)`nStart-Sleep -Seconds 60"
  [IO.File]::WriteAllText($parentFile, $parentText, [Text.UTF8Encoding]::new($true))
  $parent = Start-Process powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $parentFile + '"')) -WindowStyle Hidden -PassThru
  $deadline = (Get-Date).AddSeconds(15)
  while (-not (Test-Path -LiteralPath $heartbeat) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 100 }
  if (-not (Test-Path -LiteralPath $heartbeat)) { throw 'Detached service never became ready.' }
  $serviceId = [int][IO.File]::ReadAllText($pidFile)
  $service = Get-CimInstance Win32_Process -Filter "ProcessId=$serviceId"
  if (-not $service -or $service.CommandLine -notlike "*$fixture*") { throw 'Fixture process identity mismatch.' }
  $before = [IO.File]::ReadAllText($heartbeat)
  $parent.Kill()
  $parent.WaitForExit()
  Start-Sleep -Milliseconds 500
  $after = [IO.File]::ReadAllText($heartbeat)
  if ($before -eq $after -or -not (Get-Process -Id $serviceId -ErrorAction SilentlyContinue)) { throw 'Service died with its launching command.' }
  Write-Host 'PASS: hidden service survives forced launcher exit and preserves arguments with spaces.'
} finally {
  if ($parent -and -not $parent.HasExited) { $parent.Kill(); $parent.WaitForExit() }
  if ($service) {
    $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($service.ProcessId)"
    if ($current -and $current.CreationDate -eq $service.CreationDate -and $current.CommandLine -like "*$fixture*") {
      Stop-Process -Id $service.ProcessId -ErrorAction SilentlyContinue
    }
  }
  # Temp files stay available as failure evidence; never remove running files.
}
