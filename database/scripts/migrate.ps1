# Applique migrations/*.sql dans l'ordre contre $env:DATABASE_URL, en suivant
# les fichiers déjà appliqués dans la table schema_migrations.

if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL n'est pas défini."
    exit 1
}

$dir = Join-Path $PSScriptRoot "..\migrations"

psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());" | Out-Null

Get-ChildItem -Path $dir -Filter *.sql | Sort-Object Name | ForEach-Object {
    $name = $_.Name
    $alreadyApplied = (psql $env:DATABASE_URL -tA -c "SELECT 1 FROM schema_migrations WHERE filename = '$name';").Trim()
    if ($alreadyApplied -eq "1") {
        Write-Host "skip  $name (déjà appliquée)"
        return
    }
    Write-Host "apply $name"
    psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
    psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (filename) VALUES ('$name');" | Out-Null
}

Write-Host "Migrations à jour."
