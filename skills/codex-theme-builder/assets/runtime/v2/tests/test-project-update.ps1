[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$runtime = Split-Path -Parent $PSScriptRoot
. (Join-Path $runtime '..\windows\scripts\common-windows.ps1')
. (Join-Path $runtime 'project-update.ps1')
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('dream-update-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$log = Join-Path $testRoot 'commands.log'
$git = (Get-Command git.exe).Source
function Test-Git {
  param([string]$At, [string[]]$GitArgs)
  Invoke-DreamSkinUpdateCommand -FilePath $git -WorkingDirectory $At -LogPath $log -Status 'git fixture' -Arguments $GitArgs
}
function Commit-Fixture {
  param([string]$At)
  [void](Test-Git $At @('add', '.'))
  [void](Test-Git $At @('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'))
}
$remote = Join-Path $testRoot 'remote.git'
$seed = Join-Path $testRoot 'seed'
$checkout = Join-Path $testRoot 'checkout with spaces'
$destination = Join-Path $testRoot 'installed skills'
[void](Test-Git $testRoot @('init', '--bare', '--initial-branch=main', $remote))
[void](Test-Git $testRoot @('clone', $remote, $seed))
New-Item -ItemType Directory -Path (Join-Path $seed 'scripts') | Out-Null
$fixture = @'
param([string]$DestinationRoot,[string]$ThemeId,[string]$LauncherName)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
$skill=Join-Path $DestinationRoot 'codex-theme-builder'
New-Item -ItemType Directory -Force -Path $skill | Out-Null
$value=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\payload.txt') -Raw
[IO.File]::WriteAllText((Join-Path $DestinationRoot 'installed.txt'), "$value|$ThemeId|$LauncherName")
[IO.File]::WriteAllText((Join-Path $skill 'runtime.txt'), $value)
Add-Content -LiteralPath (Join-Path $DestinationRoot 'setup-count.txt') -Value 'setup'
'@
[IO.File]::WriteAllText((Join-Path $seed 'scripts\setup-windows.ps1'), $fixture)
[IO.File]::WriteAllText((Join-Path $seed 'payload.txt'), 'v1')
Commit-Fixture $seed
[void](Test-Git $seed @('push', '-u', 'origin', 'main'))
[void](Test-Git $testRoot @('clone', $remote, $checkout))
[IO.File]::WriteAllText((Join-Path $seed 'payload.txt'), 'v2')
Commit-Fixture $seed
[void](Test-Git $seed @('push'))
$events = New-Object 'Collections.Generic.List[int]'
$options = @{RepositoryRoot=$checkout;DestinationRoot=$destination;ThemeId='sample';ThemeName='Test Theme';LogPath=$log;ProgressCallback={param($p,$s) $events.Add($p)}}
Update-DreamSkinProject @options
if ([IO.File]::ReadAllText((Join-Path $destination 'installed.txt')) -ne 'v2|sample|Test Theme') { throw 'Latest source was not installed with the requested arguments.' }
if ($events[0] -ne 2 -or $events[$events.Count-1] -ne 26) { throw 'Update progress was not reported.' }
Update-DreamSkinProject @options
if (@(Get-Content (Join-Path $destination 'setup-count.txt')).Count -ne 1) { throw 'Unchanged installations must skip setup.' }
Remove-Item -LiteralPath (Join-Path $destination 'codex-theme-builder\runtime.txt')
Update-DreamSkinProject @options
if (@(Get-Content (Join-Path $destination 'setup-count.txt')).Count -ne 2) { throw 'Missing installed files must invalidate the cache.' }
[IO.File]::WriteAllText((Join-Path $destination 'codex-theme-builder\runtime.txt'), 'changed installed file')
Update-DreamSkinProject @options
if (@(Get-Content (Join-Path $destination 'setup-count.txt')).Count -ne 3) { throw 'Modified installed files must invalidate the cache.' }
[IO.File]::WriteAllText((Join-Path $seed 'payload.txt'), 'v2-new')
Commit-Fixture $seed
[void](Test-Git $seed @('push'))
Update-DreamSkinProject @options
if (@(Get-Content (Join-Path $destination 'setup-count.txt')).Count -ne 4 -or
    [IO.File]::ReadAllText((Join-Path $destination 'codex-theme-builder\runtime.txt')) -ne 'v2-new') {
  throw 'A new upstream revision must run setup instead of using the old installation cache.'
}
$head = Test-Git $checkout @('rev-parse', 'HEAD')
[IO.File]::WriteAllText((Join-Path $checkout 'payload.txt'), 'local work')
$rejected = $false
try { Update-DreamSkinProject @options } catch { $rejected = $true }
if (-not $rejected -or [IO.File]::ReadAllText((Join-Path $checkout 'payload.txt')) -ne 'local work') { throw 'Dirty checkout was not protected.' }
[void](Test-Git $checkout @('restore', 'payload.txt'))
[IO.File]::WriteAllText((Join-Path $checkout 'payload.txt'), 'local commit')
Commit-Fixture $checkout
$localHead = Test-Git $checkout @('rev-parse', 'HEAD')
[IO.File]::WriteAllText((Join-Path $seed 'payload.txt'), 'v3')
Commit-Fixture $seed
[void](Test-Git $seed @('push'))
$rejected = $false
try { Update-DreamSkinProject @options } catch { $rejected = $true }
if (-not $rejected -or (Test-Git $checkout @('rev-parse', 'HEAD')) -ne $localHead) { throw 'Diverged branches must fail without rewriting local commits.' }
$failureCheckout = Join-Path $testRoot 'failure checkout'
[void](Test-Git $testRoot @('clone', $remote, $failureCheckout))
[IO.File]::WriteAllText((Join-Path $failureCheckout 'scripts\setup-windows.ps1'), 'throw "fixture setup failed"')
Commit-Fixture $failureCheckout
$options.RepositoryRoot = $failureCheckout
$rejected = $false
try { Update-DreamSkinProject @options } catch { $rejected = $_.Exception.Message -match 'fixture setup failed' }
if (-not $rejected) { throw 'Setup failures must propagate instead of starting with stale configuration.' }
$pumps = New-Object 'Collections.Generic.List[int]'
$rejected = $false
$clock = [Diagnostics.Stopwatch]::StartNew()
try {
  Invoke-DreamSkinUpdateCommand -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') `
    -Arguments @('-NoProfile','-Command','Start-Sleep -Seconds 10') -WorkingDirectory $testRoot -LogPath $log `
    -Status 'timeout fixture' -Percent 8 -TimeoutSeconds 1 -ProgressCallback {param($p,$s) $pumps.Add($p)}
} catch { $rejected = $true }
if (-not $rejected -or $clock.Elapsed.TotalSeconds -gt 5 -or $pumps.Count -lt 2) { throw 'Hung commands must time out while progress callbacks remain responsive.' }
Write-Host "PASS: pull-before-install, unchanged-version fast path, missing/modified file repair, new-revision install, spaced arguments, progress callbacks, dirty work protection, ff-only divergence, setup failure and responsive timeout. Fixtures: $testRoot"
