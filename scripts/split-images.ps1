# Script PowerShell para dividir a imagem em 4 partes usando System.Drawing
Add-Type -AssemblyName System.Drawing

$inputPath = ".\Imagens\Nova imagem.png"
$outputDir = ".\Imagens"

# Carregar a imagem original
$img = [System.Drawing.Image]::FromFile((Resolve-Path $inputPath))

$width = $img.Width
$height = $img.Height
$halfWidth = [int]($width / 2)
$halfHeight = [int]($height / 2)

Write-Host "Imagem: $width x $height pixels"
Write-Host "Dividindo em 4 partes de $halfWidth x $halfHeight"

# Função para recortar e salvar
function Split-Image {
    param($x, $y, $w, $h, $name)
    
    $bitmap = New-Object System.Drawing.Bitmap($w, $h)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    $srcRect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    
    $graphics.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    
    $outputPath = Join-Path $outputDir $name
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    
    Write-Host "✓ Salvo: $name"
}

# Dividir em 4 partes (superior esquerda, superior direita, inferior esquerda, inferior direita)
Split-Image 0 0 $halfWidth $halfHeight "macho_adulto.png"
Split-Image $halfWidth 0 $halfWidth $halfHeight "macho_filhote.png"
Split-Image 0 $halfHeight $halfWidth $halfHeight "femea_adulta.png"
Split-Image $halfWidth $halfHeight $halfWidth $halfHeight "femea_filhote.png"

$img.Dispose()

Write-Host ""
Write-Host "✓ Concluído! 4 imagens criadas em $outputDir"
