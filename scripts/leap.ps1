# Called by LEAP.bat. Use a private runtime; leave system Node.js alone.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$cache = Join-Path $root '.leap'
$runtime = Join-Path $cache 'node'
$node = Join-Path $runtime 'node.exe'
$npm = Join-Path $runtime 'node_modules\npm\bin\npm-cli.js'

function Get-LeapArchive($url, $destination) {
    # Stream the archive so Windows PowerShell 5.1 can show real download progress.
    $request = [Net.HttpWebRequest]::Create($url)
    $request.Timeout = 600000
    $request.ReadWriteTimeout = 60000
    $response = $null
    $inputStream = $null
    $outputStream = $null
    try {
        $response = $request.GetResponse()
        $inputStream = $response.GetResponseStream()
        $outputStream = [IO.File]::Create($destination)
        $buffer = New-Object byte[] 262144
        $received = 0L
        while (($count = $inputStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $outputStream.Write($buffer, 0, $count)
            $received += $count
            $percent = -1
            if ($response.ContentLength -gt 0) {
                $percent = [Math]::Min(100, [int](100 * $received / $response.ContentLength))
            }
            Write-Progress -Activity 'Getting LEAP ready' -Status 'Downloading Node.js, the tool that runs LEAP' -PercentComplete $percent
        }
    } finally {
        if ($outputStream) { $outputStream.Dispose() }
        if ($inputStream) { $inputStream.Dispose() }
        if ($response) { $response.Dispose() }
        Write-Progress -Activity 'Getting LEAP ready' -Completed
    }
}

function Install-LeapNode {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $machine = $env:PROCESSOR_ARCHITECTURE
    if ($env:PROCESSOR_ARCHITEW6432) { $machine = $env:PROCESSOR_ARCHITEW6432 }
    switch ($machine) {
        'AMD64' { $arch = 'x64' }
        'ARM64' { $arch = 'arm64' }
        default { throw 'This launcher needs 64-bit Windows on Intel, AMD or ARM.' }
    }
    New-Item -ItemType Directory -Force -Path $cache | Out-Null
    $lock = $null
    $stage = $null
    try {
        try {
            # Windows releases this lock even if the window is closed during setup.
            $lock = [IO.File]::Open((Join-Path $cache 'download.windows.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
        } catch {
            throw 'LEAP is getting ready in another window. Keep that window open.'
        }
        $stage = Join-Path $cache ('download.' + [Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $stage | Out-Null
        Write-Host "`n[1/4] Getting Node.js, the tool that runs LEAP."
        Write-Host 'Setup stays in this game folder. No administrator access is needed.'
        Write-Host 'Finding the current LTS release. The first start needs internet.'
        $index = Join-Path $stage 'index.tab'
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri 'https://nodejs.org/dist/index.tab' -OutFile $index
        $release = Get-Content $index | ConvertFrom-Csv -Delimiter "`t" |
            Where-Object { $_.lts -and $_.lts -ne '-' } | Select-Object -First 1
        $version = $release.version
        if ($version -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
            throw 'Could not find the current Node.js LTS release. Open this launcher to try again.'
        }
        $name = "node-$version-win-$arch"
        $archive = "$name.zip"
        $checksums = Join-Path $stage 'checksums'
        $zip = Join-Path $stage $archive
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri "https://nodejs.org/dist/$version/SHASUMS256.txt" -OutFile $checksums
        Write-Host "Downloading Node.js $version..."
        $ProgressPreference = 'Continue'
        Get-LeapArchive "https://nodejs.org/dist/$version/$archive" $zip
        Write-Host 'Checking the download before unpacking it...'
        $pattern = '^([a-fA-F0-9]{64})\s+' + [regex]::Escape($archive) + '$'
        $expected = Get-Content $checksums | Where-Object { $_ -match $pattern } |
            ForEach-Object { ($_ -split '\s+')[0] } | Select-Object -First 1
        if (-not $expected -or (Get-FileHash -Algorithm SHA256 $zip).Hash -ne $expected) {
            throw 'The Node.js download did not pass its check. Open this launcher to try again.'
        }
        Write-Host 'The download passed. Unpacking Node.js...'
        Expand-Archive -LiteralPath $zip -DestinationPath $stage
        $unpacked = Join-Path $stage $name
        & (Join-Path $unpacked 'node.exe') --version
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $unpacked 'node_modules\npm\bin\npm-cli.js'))) {
            throw 'Node.js could not start on this computer.'
        }
        if (Test-Path $runtime) { Remove-Item -Recurse -Force -LiteralPath $runtime }
        Move-Item -LiteralPath $unpacked -Destination $runtime
    } finally {
        if ($stage -and (Test-Path $stage)) { Remove-Item -Recurse -Force -LiteralPath $stage }
        if ($lock) { $lock.Dispose() }
    }
}

try {
    $ready = (Test-Path $node) -and (Test-Path $npm)
    if ($ready) {
        try {
            & $node --version | Out-Null
            $ready = $LASTEXITCODE -eq 0
        } catch { $ready = $false }
    }
    if (-not $ready) { Install-LeapNode }
    & $node (Join-Path $PSScriptRoot 'leap.mjs')
    $result = $LASTEXITCODE
    # A future dependency may need a newer Node.js. Refresh once, then show errors.
    if ($result -eq 42) {
        Install-LeapNode
        & $node (Join-Path $PSScriptRoot 'leap.mjs')
        $result = $LASTEXITCODE
    }
    if ($result -eq 42) {
        Write-Host 'The current Node.js LTS cannot run this version of LEAP. Check for a game update.' -ForegroundColor Red
    }
    exit $result
} catch {
    if ($_.Exception.Message -eq 'LEAP is getting ready in another window. Keep that window open.') {
        Write-Host "`n$($_.Exception.Message)"
        Write-Host 'When it is ready, open http://localhost:5173 or run this launcher again.'
        exit 0
    }
    Write-Host "`nLEAP could not start. $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Check your internet connection, then open this launcher to try again.'
    exit 1
}
