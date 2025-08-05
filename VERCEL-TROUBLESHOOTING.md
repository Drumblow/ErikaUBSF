# 🔧 Vercel Troubleshooting Guide

## 🚨 Problemas Comuns e Soluções

### 1. **Erro de Build com Puppeteer**

**Sintomas:**
- Build falha no Vercel
- Erro relacionado a `@sparticuz/chromium` ou `puppeteer-core`
- Timeout durante instalação

**Soluções:**
```bash
# 1. Verificar se as dependências estão corretas
npm install @sparticuz/chromium@^123.0.0 puppeteer-core@^22.11.0

# 2. Limpar cache do npm
npm cache clean --force

# 3. Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### 2. **Erro de Runtime Node.js**

**Sintomas:**
- Erro: "Node.js version not supported"
- Build falha por incompatibilidade de versão

**Solução:**
- ✅ Configurado para `nodejs20.x` no `vercel.json`
- ✅ Engine configurado para `>=18.x` no `package.json`

### 3. **Timeout em Funções**

**Sintomas:**
- Função excede tempo limite
- PDF não é gerado

**Solução:**
- ✅ `maxDuration: 30` configurado no `vercel.json`
- ✅ Timeout otimizado para geração de PDF

### 4. **Problemas de Memória**

**Sintomas:**
- Out of memory errors
- Build falha por falta de recursos

**Soluções:**
```json
// vercel.json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs20.x",
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

### 5. **Variáveis de Ambiente**

**Verificar no Vercel Dashboard:**
- `DATABASE_URL` - URL do banco de dados
- `JWT_SECRET` - Chave secreta para JWT
- `NODE_ENV` - Definido como "production"

### 6. **Logs de Debug**

**Como verificar logs:**
1. Acesse o Vercel Dashboard
2. Vá em "Functions" → "View Function Logs"
3. Procure por erros específicos

**Logs úteis:**
```javascript
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🚀 Puppeteer mode:', process.env.NODE_ENV === 'production' ? 'Vercel' : 'Local');
```

## 🛠️ Comandos de Diagnóstico

### Local
```bash
# Testar localmente
npm run dev

# Testar geração de PDF
node examples/test-pdf-puppeteer.js

# Verificar dependências
npm ls @sparticuz/chromium puppeteer-core
```

### Vercel
```bash
# Deploy manual
vercel --prod

# Verificar logs
vercel logs

# Verificar configuração
vercel env ls
```

## 📋 Checklist de Deploy

- [ ] Node.js 20.x configurado
- [ ] Dependências do Puppeteer instaladas
- [ ] Variáveis de ambiente configuradas
- [ ] `maxDuration` definido
- [ ] `.vercelignore` otimizado
- [ ] Prisma schema gerado

## 🆘 Se Nada Funcionar

1. **Rollback temporário:**
   - Remover rota `/pdf-puppeteer`
   - Usar apenas `/pdf` (PDFShift)

2. **Deploy incremental:**
   - Deploy sem Puppeteer primeiro
   - Adicionar Puppeteer depois

3. **Verificar logs detalhados:**
   - Vercel Dashboard → Functions → Logs
   - Procurar por stack traces específicos

## 📞 Contato

Se o problema persistir, verificar:
- [Vercel Documentation](https://vercel.com/docs)
- [Puppeteer on Vercel Guide](https://vercel.com/guides/puppeteer-on-vercel)
- [@sparticuz/chromium Issues](https://github.com/Sparticuz/chromium/issues)