$ErrorActionPreference = 'Stop'

$headers = @{ 'User-Agent' = 'AviGestaoBot/1.0 (local script)' }
$outputDir = Join-Path 'public' 'birds'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$speciesList = @(
  @{ Name = 'Canário Belga'; Slug = 'canario-belga'; WikiavesSlug = $null },
  @{ Name = 'Canário da Terra'; Slug = 'canario-da-terra'; WikiavesSlug = 'canario-da-terra' },
  @{ Name = 'Curió'; Slug = 'curio'; WikiavesSlug = 'curio' },
  @{ Name = 'Coleiro'; Slug = 'coleiro'; WikiavesSlug = 'coleirinho' },
  @{ Name = 'Tiziu'; Slug = 'tiziu'; WikiavesSlug = 'tiziu' },
  @{ Name = 'Sabiá Laranjeira'; Slug = 'sabia-laranjeira'; WikiavesSlug = 'sabia-laranjeira' },
  @{ Name = 'Caboclinho'; Slug = 'caboclinho'; WikiavesSlug = 'caboclinho' },
  @{ Name = 'Trinca-Ferro'; Slug = 'trinca-ferro'; WikiavesSlug = 'trinca-ferro' },
  @{ Name = 'Bicudo'; Slug = 'bicudo'; WikiavesSlug = 'bicudo' },
  @{ Name = 'Azulão'; Slug = 'azulao'; WikiavesSlug = 'azulao' },
  @{ Name = 'Pintassilgo'; Slug = 'pintassilgo'; WikiavesSlug = 'pintassilgo' },
  @{ Name = 'Agapornis'; Slug = 'agapornis'; WikiavesSlug = $null },
  @{ Name = 'Calopsita'; Slug = 'calopsita'; WikiavesSlug = $null },
  @{ Name = 'Periquito'; Slug = 'periquito'; WikiavesSlug = $null },
  @{ Name = 'Manon'; Slug = 'manon'; WikiavesSlug = $null },
  @{ Name = 'Mandarin'; Slug = 'mandarin'; WikiavesSlug = $null }
)

function Invoke-WithRetry([scriptblock]$action) {
  for ($attempt = 1; $attempt -le 4; $attempt++) {
    try {
      return & $action
    } catch {
      $resp = $_.Exception.Response
      if ($resp -and $resp.StatusCode -eq 429 -and $attempt -lt 4) {
        Start-Sleep -Seconds (5 * $attempt)
        continue
      }
      throw
    }
  }
}

function Get-WikiavesPage([string]$slug) {
  $url = "https://www.wikiaves.com.br/wiki/$slug"
  $html = Invoke-WithRetry { (Invoke-WebRequest -Uri $url -UseBasicParsing -Headers $headers).Content }
  Start-Sleep -Milliseconds 800
  return [ordered]@{ url = $url; html = $html }
}

function Get-WikiavesPhotoIds([string]$html) {
  $machoMatch = [regex]::Match($html, 'id=\"FOTOMACHO\"[\s\S]*?href=\"/(\d+)', 'IgnoreCase')
  $femeaMatch = [regex]::Match($html, 'id=\"FOTOFEMEA\"[\s\S]*?href=\"/(\d+)', 'IgnoreCase')
  $machoId = if ($machoMatch.Success) { $machoMatch.Groups[1].Value } else { $null }
  $femeaId = if ($femeaMatch.Success) { $femeaMatch.Groups[1].Value } else { $null }
  return [ordered]@{ macho = $machoId; femea = $femeaId }
}

function Get-WikiavesMediaDetails([string]$mediaId) {
  $url = "https://www.wikiaves.com.br/_midia_detalhes.php?m=$mediaId"
  $html = Invoke-WithRetry { (Invoke-WebRequest -Uri $url -UseBasicParsing -Headers $headers).Content }
  Start-Sleep -Milliseconds 800

  $pattern = 'https?://[^\s\"'']+media\.wikiaves[^\s\"'']+'
  $imgMatches = [regex]::Matches($html, $pattern)
  $imgUrl = $null
  foreach ($m in $imgMatches) {
    if ($m.Value -match 'g_') { $imgUrl = $m.Value; break }
  }
  if (-not $imgUrl -and $imgMatches.Count -gt 0) {
    $imgUrl = $imgMatches[0].Value
  }

  $authorMatch = [regex]::Match($html, '<label>Autor:</label>\s*<a[^>]*>([^<]+)</a>', 'IgnoreCase')
  $author = if ($authorMatch.Success) { [System.Net.WebUtility]::HtmlDecode($authorMatch.Groups[1].Value).Trim() } else { 'WikiAves' }

  return [ordered]@{
    imgUrl = $imgUrl
    author = $author
    sourceUrl = $url
  }
}

function Invoke-DownloadFile([string]$url, [string]$dest) {
  Invoke-WithRetry { Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -Headers $headers }
  Start-Sleep -Milliseconds 800
}

$manifestPath = Join-Path $outputDir 'manifest.json'
$existingManifest = @()
if (Test-Path $manifestPath) {
  $content = [System.IO.File]::ReadAllText($manifestPath)
  $content = $content -replace "^\uFEFF", ""
  $existingManifest = $content | ConvertFrom-Json
}
$existingBySpecies = @{}
foreach ($item in $existingManifest) {
  $existingBySpecies[$item.species] = $item
}

$manifest = @()

foreach ($entry in $speciesList) {
  $speciesName = $entry.Name
  $slug = $entry.Slug
  $wikiSlug = $entry.WikiavesSlug

  if (-not $wikiSlug) {
    if ($existingBySpecies.ContainsKey($speciesName)) {
      $manifest += $existingBySpecies[$speciesName]
    }
    continue
  }

  Write-Host "Fetching $speciesName ($wikiSlug)..."
  $page = Get-WikiavesPage $wikiSlug
  $ids = Get-WikiavesPhotoIds $page.html

  if (-not $ids.macho -or -not $ids.femea) {
    Write-Warning "Missing male/female photo ids for $speciesName. Keeping existing if available."
    if ($existingBySpecies.ContainsKey($speciesName)) {
      $manifest += $existingBySpecies[$speciesName]
    }
    continue
  }

  $maleDetails = Get-WikiavesMediaDetails $ids.macho
  $femaleDetails = Get-WikiavesMediaDetails $ids.femea

  if (-not $maleDetails.imgUrl -or -not $femaleDetails.imgUrl) {
    Write-Warning "Missing image URLs for $speciesName. Keeping existing if available."
    if ($existingBySpecies.ContainsKey($speciesName)) {
      $manifest += $existingBySpecies[$speciesName]
    }
    continue
  }

  $maleExt = [System.IO.Path]::GetExtension(([uri]$maleDetails.imgUrl).AbsolutePath)
  if (-not $maleExt) { $maleExt = '.jpg' }
  $femaleExt = [System.IO.Path]::GetExtension(([uri]$femaleDetails.imgUrl).AbsolutePath)
  if (-not $femaleExt) { $femaleExt = '.jpg' }

  $maleFile = "$slug-macho$maleExt"
  $femaleFile = "$slug-femea$femaleExt"

  Invoke-DownloadFile -url $maleDetails.imgUrl -dest (Join-Path $outputDir $maleFile)
  Invoke-DownloadFile -url $femaleDetails.imgUrl -dest (Join-Path $outputDir $femaleFile)

  $manifest += [ordered]@{
    species = $speciesName
    male = [ordered]@{
      sex = 'Macho'
      filename = $maleFile
      sourceUrl = $maleDetails.sourceUrl
      author = $maleDetails.author
      license = 'WikiAves (direitos reservados)'
      licenseUrl = ''
      title = $speciesName
    }
    female = [ordered]@{
      sex = 'Fêmea'
      filename = $femaleFile
      sourceUrl = $femaleDetails.sourceUrl
      author = $femaleDetails.author
      license = 'WikiAves (direitos reservados)'
      licenseUrl = ''
      title = $speciesName
    }
  }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$manifestJson = $manifest | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, $utf8NoBom)

$md = "# Bird Images Attribution`n`n"
$md += "Imagens baixadas do WikiAves quando disponíveis. Espécies sem correspondência usam o arquivo existente no repositório.`n`n"
foreach ($item in $manifest) {
  $md += "## $($item.species)`n"
  $md += "- Macho: $($item.male.filename)`n"
  $md += "  - Autor: $($item.male.author)`n"
  $md += "  - Fonte: $($item.male.sourceUrl)`n"
  $md += "  - Licença: $($item.male.license)`n"
  $md += "- Fêmea: $($item.female.filename)`n"
  $md += "  - Autor: $($item.female.author)`n"
  $md += "  - Fonte: $($item.female.sourceUrl)`n"
  $md += "  - Licença: $($item.female.license)`n`n"
}
[System.IO.File]::WriteAllText((Join-Path $outputDir 'ATTRIBUTION.md'), $md, $utf8NoBom)

Write-Host "Done. Images saved to $outputDir"
