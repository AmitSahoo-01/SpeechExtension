$ErrorActionPreference = 'Stop'

$libsDir = "c:\Users\VIVOBOOK\OneDrive\Desktop\SpeechExtension\libs"
if (-not (Test-Path $libsDir)) {
    New-Item -ItemType Directory -Path $libsDir | Out-Null
}

Write-Host "Downloading Transformers.js..."
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js" -OutFile "$libsDir\transformers.min.js"

Write-Host "Downloading FFmpeg.js components..."
Invoke-WebRequest -Uri "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js" -OutFile "$libsDir\ffmpeg.js"
Invoke-WebRequest -Uri "https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js" -OutFile "$libsDir\ffmpeg-util.js"

# Need core files as well
Invoke-WebRequest -Uri "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js" -OutFile "$libsDir\ffmpeg-core.js"
Invoke-WebRequest -Uri "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm" -OutFile "$libsDir\ffmpeg-core.wasm"

Write-Host "Done downloading dependencies to libs/ folder."
