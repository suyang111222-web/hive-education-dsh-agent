[CmdletBinding()]
param(
    [string]$DshRoot,
    [switch]$DumpConfig
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

if ([string]::IsNullOrWhiteSpace($DshRoot)) {
    $DshRoot = Join-Path (Split-Path -Parent $projectRoot) 'deepseek-harness'
}
$DshRoot = (Resolve-Path -LiteralPath $DshRoot).Path

$nodeRoot = Join-Path $DshRoot '.runtime\node-v24.19.0-win-x64'
$nodeExecutable = Join-Path $nodeRoot 'node.exe'
$npmCommand = Join-Path $nodeRoot 'npm.cmd'
$corepackCommand = Join-Path $nodeRoot 'corepack.cmd'
$overlayPath = Join-Path $projectRoot 'dsh\hive-education.cordis.yml'

foreach ($requiredPath in @($nodeExecutable, $npmCommand, $overlayPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required dependency was not found: $requiredPath"
    }
}

# DSH 的 npm 脚本会再次按名称启动 node，因此必须把同一 Node 目录加入 PATH。
$env:PATH = "$nodeRoot;$env:PATH"
$env:HIVE_AGENT_ROOT = $projectRoot
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue

Push-Location $projectRoot
try {
    if ($null -ne $pnpmCommand) {
        & $pnpmCommand.Source build
    }
    elseif (Test-Path -LiteralPath $corepackCommand -PathType Leaf) {
        & $corepackCommand pnpm build
    }
    else {
        throw 'pnpm.cmd and Corepack are both unavailable'
    }
    if ($LASTEXITCODE -ne 0) { throw "pnpm build failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

Push-Location $DshRoot
try {
    if ($DumpConfig) {
        & $npmCommand run dsh -- --profile web --patch $overlayPath --dump-config
    }
    else {
        & $npmCommand run dsh -- --profile web --patch $overlayPath
    }
    if ($LASTEXITCODE -ne 0) { throw "DeepSeek Harness exited with code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

