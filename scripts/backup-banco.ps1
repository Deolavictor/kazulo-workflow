# Backup do SQLite — agende no Agendador de Tarefas do Windows (diário)
$ErrorActionPreference = "Stop"

$dataDir = if ($env:DB_PATH) {
    Split-Path -Parent $env:DB_PATH
} else {
    "D:\Kazulo\dados"
}

$dbFile = if ($env:DB_PATH) { $env:DB_PATH } else { Join-Path $dataDir "kazulo.db" }
$backupRoot = "D:\Kazulo\backups"
$keepDays = 30

if (-not (Test-Path $dbFile)) {
    Write-Warning "Banco nao encontrado: $dbFile"
    exit 1
}

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$dest = Join-Path $backupRoot "kazulo_$stamp.db"
Copy-Item -Path $dbFile -Destination $dest -Force
Write-Host "Backup criado: $dest"

Get-ChildItem $backupRoot -Filter "kazulo_*.db" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$keepDays) } |
    Remove-Item -Force
