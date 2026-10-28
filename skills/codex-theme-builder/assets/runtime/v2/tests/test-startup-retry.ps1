param([Parameter(Mandatory)][string]$NodePath)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '..\..\windows\scripts\common-windows.ps1')
$tokens=$null;$errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '..\launch.ps1'),[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Launch PowerShell parsing failed'}
foreach($name in @('Invoke-DreamSkinVerificationAttempt','Test-DreamSkinVerifiedInjection')){
 $fn=$ast.FindAll({param($n)$n -is [System.Management.Automation.Language.FunctionDefinitionAst]},$true)|Where-Object Name -eq $name
 Invoke-Expression $fn.Extent.Text
}
function Report-DreamSkinLaunchProgress {param($Percent,$Status,$Stage)}
function Start-Sleep {param($Milliseconds)}
$testRoot=Join-Path ([IO.Path]::GetTempPath()) ('dream-startup-tests-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$counter=Join-Path $testRoot 'counter.txt';$log=Join-Path $testRoot 'verification.log'
$oldCounter=$env:DREAM_VERIFIER_TEST_COUNTER;$oldMode=$env:DREAM_VERIFIER_TEST_MODE
try{
 $env:DREAM_VERIFIER_TEST_COUNTER=$counter;$env:DREAM_VERIFIER_TEST_MODE='recover'
 $fixture=Join-Path $PSScriptRoot 'fixtures\verification-child.mjs'
 $arguments=@{NodePath=$NodePath;InjectorPath=$fixture;Port=55555;BrowserId='test';ThemePath='theme with spaces';VerificationLogPath=$log;AttemptTimeoutMs=1000}
 if(-not (Test-DreamSkinVerifiedInjection @arguments)){throw 'Transient stderr must recover on third attempt'}
 if((Get-Content -LiteralPath $counter -Raw) -ne '3'){throw 'Expected three real child processes'}
 $content=Get-Content -LiteralPath $log -Raw
 if($content -notmatch 'simulated renderer reload' -or $content -notmatch 'attempt 3/3' -or $content -notmatch 'verifier exit=0'){throw 'Native stderr or retry diagnostics lost'}
 $env:DREAM_VERIFIER_TEST_MODE='fail'
 if(Test-DreamSkinVerifiedInjection @arguments){throw 'Persistent failure must never pass'}
 if((Get-Content -LiteralPath $counter -Raw) -ne '6'){throw 'Persistent failure must exhaust three attempts'}
 $env:DREAM_VERIFIER_TEST_MODE='hang'
 if(Invoke-DreamSkinVerificationAttempt @arguments){throw 'Hung child must never pass'}
 if((Get-Content -LiteralPath $log -Raw) -notmatch 'timedOut=True'){throw 'Hung child deadline must be logged'}
 Write-Host 'PASS: real stderr retries, concurrent large pipe draining, argument quoting, persistent failure, and bounded hung-child cleanup under PowerShell.'
}finally{
 $env:DREAM_VERIFIER_TEST_COUNTER=$oldCounter;$env:DREAM_VERIFIER_TEST_MODE=$oldMode
 $resolved=[IO.Path]::GetFullPath($testRoot)
 if($resolved.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()),[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolved -Leaf).StartsWith('dream-startup-tests-')){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
