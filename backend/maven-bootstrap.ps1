$ErrorActionPreference = 'Stop'
$version = '3.9.12'
$toolsDir = Join-Path $PSScriptRoot '.tools'
$mavenDir = Join-Path $toolsDir "apache-maven-$version"
$mavenCmd = Join-Path $mavenDir 'bin\mvn.cmd'

$cachedMaven = 'C:\Users\resmi\.m2\wrapper\dists\apache-maven-3.9.12\6068d197\bin\mvn.cmd'
if (Test-Path -LiteralPath $cachedMaven) {
    & $cachedMaven '-Dmaven.repo.local=C:\Users\resmi\.m2\repository' @args
    exit $LASTEXITCODE
}

if (-not (Test-Path -LiteralPath $mavenCmd)) {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $archive = Join-Path $toolsDir "apache-maven-$version-bin.zip"
    $url = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$version/apache-maven-$version-bin.zip"
    Write-Host "Downloading Apache Maven $version..."
    Invoke-WebRequest -Uri $url -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $toolsDir -Force
    Remove-Item -LiteralPath $archive -Force
}

& $mavenCmd @args
exit $LASTEXITCODE

