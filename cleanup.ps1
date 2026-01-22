# Clean up temporary/test files

# Remove temp HTML files
if (Test-Path "c:\avigestao\tmp_wikiaves_bicudo.html") { Remove-Item "c:\avigestao\tmp_wikiaves_bicudo.html" }
if (Test-Path "c:\avigestao\tmp_wikiaves_species.html") { Remove-Item "c:\avigestao\tmp_wikiaves_species.html" }
if (Test-Path "c:\avigestao\tmp_wikiaves_species_p1.html") { Remove-Item "c:\avigestao\tmp_wikiaves_species_p1.html" }

# Remove temp JS files
if (Test-Path "c:\avigestao\tmp_wikiaves_midia.js") { Remove-Item "c:\avigestao\tmp_wikiaves_midia.js" }
if (Test-Path "c:\avigestao\tmp_wikiaves_midias.js") { Remove-Item "c:\avigestao\tmp_wikiaves_midias.js" }

# Remove backup/generated files
if (Test-Path "c:\avigestao\vite.config.zip") { Remove-Item "c:\avigestao\vite.config.zip" }
if (Test-Path "c:\avigestao\build.log") { Remove-Item "c:\avigestao\build.log" }

# Remove unused service
if (Test-Path "c:\avigestao\services\persist.ts") { Remove-Item "c:\avigestao\services\persist.ts" }

# Remove test files
if (Test-Path "c:\avigestao\public\birds\test.json") { Remove-Item "c:\avigestao\public\birds\test.json" }

Write-Host "✅ Cleanup complete!"
Write-Host "Removed:"
Write-Host "  - tmp_wikiaves_*.html files"
Write-Host "  - tmp_wikiaves_*.js files"
Write-Host "  - vite.config.zip"
Write-Host "  - build.log"
Write-Host "  - services/persist.ts"
Write-Host "  - public/birds/test.json"
