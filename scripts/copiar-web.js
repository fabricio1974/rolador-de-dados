// Copia só os arquivos do app (o que vai dentro do APK) para a pasta www/,
// incluindo a Ficha de Personagem (pasta ficha/, aberta pelo menu ☰).
// O site do GitHub Pages continua usando os arquivos da raiz do repositório.
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'www');
fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino);
for (const item of ['index.html', 'css', 'js', 'icones', 'ficha']) {
  const origem = path.join(raiz, item);
  // ficha/dados/ (os JSON de origem) e os testes não vão no APK: o app usa ficha/dados5e.js.
  const fora = [path.join(raiz, 'ficha', 'dados'), path.join(raiz, 'ficha', 'testes.js')];
  if (fs.existsSync(origem)) fs.cpSync(origem, path.join(destino, item), { recursive: true, filter: (f) => !fora.includes(f) });
}
console.log('www/ pronta:', fs.readdirSync(destino).join(', '));
