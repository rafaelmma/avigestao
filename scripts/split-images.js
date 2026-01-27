const fs = require('fs');
const path = require('path');

// Como não temos sharp ou canvas instalado, vamos usar uma abordagem manual
// O usuário precisará dividir manualmente ou usar uma ferramenta online

console.log('Para dividir a imagem "Nova imagem.png" em 4 partes:');
console.log('');
console.log('Opção 1 - Online (mais fácil):');
console.log('1. Acesse: https://www.iloveimg.com/pt/dividir-imagem');
console.log('2. Faça upload de "Nova imagem.png"');
console.log('3. Divida em 2x2 (4 partes)');
console.log('4. Baixe e renomeie:');
console.log('   - Superior esquerdo: macho_adulto.png');
console.log('   - Superior direito: macho_filhote.png');
console.log('   - Inferior esquerdo: femea_adulta.png');
console.log('   - Inferior direito: femea_filhote.png');
console.log('');
console.log('Opção 2 - Paint (Windows):');
console.log('1. Abra "Nova imagem.png" no Paint');
console.log('2. Use a ferramenta "Selecionar" para recortar cada quadrante');
console.log('3. Ctrl+X (recortar), Ctrl+N (novo), Ctrl+V (colar)');
console.log('4. Salve com os nomes acima');
console.log('');
console.log('Opção 3 - PowerShell + System.Drawing (se disponível):');
console.log('Execute o script PS1 que vou criar...');
