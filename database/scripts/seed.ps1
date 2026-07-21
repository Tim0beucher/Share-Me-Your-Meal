# Applique seeds/*.sql dans l'ordre contre $env:DATABASE_URL. Les seeds
# utilisent ON CONFLICT DO NOTHING, donc rejouer ce script est sans risque.

if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL n'est pas défini."
    exit 1
}

$dir = Join-Path $PSScriptRoot "..\seeds"

Get-ChildItem -Path $dir -Filter *.sql | Sort-Object Name | ForEach-Object {
    Write-Host "seed  $($_.Name)"
    psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
}

Write-Host "Seeds appliqués."
