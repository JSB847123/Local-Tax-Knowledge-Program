$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

python -m PyInstaller `
  --noconfirm `
  --clean `
  --name TaxFlow `
  --onefile `
  --add-data "index.html;." `
  --add-data "styles.css;." `
  --add-data "app.js;." `
  run_taxflow.py

Write-Host "Built: $ProjectRoot\dist\TaxFlow.exe"
