const crypto = require('crypto');

console.log('🔐 GERADOR DE CHAVES SEGURAS PARA O CLOAKER');
console.log('============================================\n');

// Gerar JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('base64');
console.log('JWT_SECRET=' + jwtSecret);

// Gerar Session Secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET=' + sessionSecret);

// Gerar Encryption Key (32 caracteres para AES-256)
const encryptionKey = crypto.randomBytes(32).toString('base64').substring(0, 32);
console.log('ENCRYPTION_KEY=' + encryptionKey);

console.log('\n⚠️  IMPORTANTE:');
console.log('1. Copie essas chaves para seu arquivo .env');
console.log('2. NUNCA compartilhe essas chaves');
console.log('3. Use chaves diferentes para cada ambiente (desenvolvimento/produção)');
console.log('4. Mantenha backup seguro dessas chaves');
