$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\..\windows\scripts\common-windows.ps1')

# All process operations are mocked in this isolated test process. No real
# system processes are inspected or stopped by these identity scenarios.
$script:candidate = $null
$script:stopped = @()
$script:pathReads = 0
function Get-CimInstance { param($ClassName, $Filter, $ErrorAction) return $script:candidate }
function Get-DreamSkinProcessExecutablePath {
  param($ProcessInfo)
  $script:pathReads += 1
  return $ProcessInfo.ExecutablePath
}
function Get-DreamSkinProcessStartedAt { param($ProcessId) return 'recorded-start' }
function Stop-Process { param($Id, [switch]$Force, $ErrorAction) $script:stopped += $Id }
function Wait-Process { param($Id, $Timeout, $ErrorAction) }
function Get-Process { param($Id, $ErrorAction) return $null }

$state = [pscustomobject]@{
  injectorPid = 8300
  injectorPath = 'C:\theme\injector.mjs'
  nodePath = 'C:\runtime\node.exe'
  injectorStartedAt = 'recorded-start'
  port = 60706
  browserId = 'recorded-browser'
}
function Assert-IdentityCase { param([bool]$Condition, [string]$Message) if (-not $Condition) { throw $Message } }
Assert-IdentityCase (Stop-DreamSkinRecordedInjector -State $null) 'Absent state must be harmless.'
Assert-IdentityCase (Stop-DreamSkinRecordedInjector -State $state) 'Exited watcher must be harmless.'
$script:candidate = [pscustomobject]@{ Name='SecurityHealthService.exe'; ExecutablePath=$null; CommandLine=$null }
$result = Stop-DreamSkinRecordedInjector -State $state -WarningAction SilentlyContinue
Assert-IdentityCase ($result -eq $false -and $script:stopped.Count -eq 0 -and $script:pathReads -eq 0) 'Protected non-Node PID reuse must skip without reading protected fields or killing it.'
foreach ($name in @('node.exe', '')) {
  $script:candidate = [pscustomobject]@{ Name=$name; ExecutablePath=$null; CommandLine=$null }
  $threw = $false
  try { Stop-DreamSkinRecordedInjector -State $state | Out-Null } catch { $threw = $true }
  Assert-IdentityCase ($threw -and $script:stopped.Count -eq 0) 'Unreadable Node or unknown process must remain protected.'
}
$script:candidate = [pscustomobject]@{ Name='node.exe'; ExecutablePath=$state.nodePath; CommandLine='node.exe unrelated-script.mjs' }
Assert-IdentityCase ((Stop-DreamSkinRecordedInjector -State $state -WarningAction SilentlyContinue) -eq $false) 'Unrelated Node must not be stopped.'
Assert-IdentityCase ($script:stopped.Count -eq 0) 'Unrelated process stop was attempted.'
$script:candidate.CommandLine = 'node.exe C:\theme\injector.mjs --watch --port 60706 --browser-id recorded-browser'
Assert-IdentityCase (Stop-DreamSkinRecordedInjector -State $state) 'Verified original watcher must still be stoppable.'
Assert-IdentityCase ($script:stopped.Count -eq 1 -and $script:stopped[0] -eq 8300) 'Only the verified recorded watcher may be stopped.'
Write-Host 'PASS: absent watcher, protected PID reuse, unreadable identity, unrelated Node, and verified watcher termination.'
