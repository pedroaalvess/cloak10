# 🚀 Deploy no Railway - VERSÃO CORRIGIDA

## ✅ Problemas Corrigidos

### 1. **Erro de Build Nixpacks**
- ❌ **Problema**: `error: undefined variable 'npm'`
- ✅ **Solução**: Removido `npm` do `nixpacks.toml` (já vem com Node.js)
- ✅ **Solução**: Removido script de build desnecessário

### 2. **Configuração Otimizada**
- ✅ Criado `railway.toml` (formato mais estável)
- ✅ Removido `railway.json` (evita conflitos)
- ✅ Criado `.railwayignore` (otimiza upload)

## 🚀 Deploy Atualizado

### Passo 1: Configurar Variáveis de Ambiente

No Railway Dashboard, configure estas variáveis **EXATAS**:

```env
PORT=3000
NODE_ENV=production
DB_PATH=./data/cloaker.db
JWT_SECRET=7/TEs4pMr4+mysguXrYGlfypkgEnjbZMveX4Ne/xouj51unkcq1ozqTrAxKqpY4sEs8ZJGfOGA2SS53ZmvqgaA==
SESSION_SECRET=ec47e2919946b26f6a41e86132fff1c03a7d1d7b5a76f24e340ba13a6a6b0849
ENCRYPTION_KEY=8szwlXlJKRn3ZyPETvjEqtKBWFTDjhOZ
CLOAKER_MODE=production
DEFAULT_LANDING_PAGE=https://seusite.com
SAFE_PAGE=https://seusite.com/safe
LOG_LEVEL=info
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
USE_PROXY=false
CAPTCHA_ENABLED=false
HONEYPOT_ENABLED=true
```

### Passo 2: Deploy

1. **Conecte o repositório** no Railway
2. **Configure as variáveis** acima
3. **Deploy automático** será executado
4. **Aguarde o build** (agora deve funcionar)

### Passo 3: Verificar

1. **Health Check**: `https://seu-app.railway.app/health`
2. **Painel Admin**: `https://seu-app.railway.app/admin`
3. **Credenciais**: `admin` / `admin123`

## 🔧 Arquivos de Configuração

### `nixpacks.toml` (Corrigido)
```toml
[phases.setup]
nixPkgs = ["nodejs", "python3"]

[phases.install]
cmds = ["npm ci --only=production"]

[start]
cmd = "npm start"
```

### `railway.toml` (Novo)
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### `.railwayignore` (Otimização)
```
node_modules/
.env
*.log
logs/
*.md
.git/
```

## 🎯 URLs Importantes

- **Health Check**: `https://seu-app.railway.app/health`
- **Painel Admin**: `https://seu-app.railway.app/admin`
- **Página Segura**: `https://seu-app.railway.app/safe`
- **Cloaker**: `https://seu-app.railway.app/CAMPAIGN_ID`

## 🔑 Credenciais

- **Usuário**: `admin`
- **Senha**: `admin123`

⚠️ **ALTERE APÓS O PRIMEIRO LOGIN!**

## 🆘 Troubleshooting

### Se o build ainda falhar:

1. **Verifique os logs** no Railway Dashboard
2. **Confirme as variáveis** de ambiente estão corretas
3. **Aguarde 2-3 minutos** para o build completo
4. **Force um novo deploy** se necessário

### Logs de Erro Comuns:

```bash
# Se aparecer erro de módulo não encontrado:
# Verifique se todas as dependências estão no package.json

# Se aparecer erro de porta:
# Confirme que PORT=3000 está configurado

# Se aparecer erro de banco de dados:
# O SQLite será criado automaticamente
```

## 📝 Próximos Passos

1. ✅ **Deploy no Railway** (agora deve funcionar)
2. 🔄 **Alterar credenciais** padrão
3. 🔄 **Configurar campanhas** no painel admin
4. 🔄 **Testar o cloaker** com diferentes cenários
5. 🔄 **Monitorar logs** e estatísticas

---

**🎉 O cloaker está pronto para deploy! As correções foram aplicadas.**
