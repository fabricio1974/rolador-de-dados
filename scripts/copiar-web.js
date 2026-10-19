// Copia só os arquivos do app (o que vai dentro do APK) para a pasta www/.
// O site do GitHub Pages continua usando os arquivos da raiz do repositório.
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'www');
fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino);
for (const item of ['index.html', 'css', 'js', 'icones']) {
  const origem = path.join(raiz, item);
  if (fs.existsSync(origem)) fs.cpSync(origem, path.join(destino, item), { recursive: true });
}
console.log('www/ pronta:', fs.readdirSync(destino).join(', '));
