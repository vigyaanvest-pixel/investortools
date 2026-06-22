# Zip dist/ into trader-workspace.zip with forward-slash entry names (Chrome Web Store /
# Edge safe, and the public download served by GitHub Pages). Compress-Archive uses
# backslashes, which some store uploaders reject; this avoids that.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$zipPath = Join-Path $root "trader-workspace.zip"
if (-not (Test-Path $dist)) { throw "dist not found. Run: node tools/build.mjs first." }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $base = (Resolve-Path $dist).Path.TrimEnd('\') + '\'
  Get-ChildItem -Path $dist -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $zip.Dispose()
}
$z = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$kb = [math]::Round((Get-Item $zipPath).Length / 1kb, 1)
Write-Output ("trader-workspace.zip created: " + $z.Entries.Count + " entries, " + $kb + " KB")
$z.Dispose()
