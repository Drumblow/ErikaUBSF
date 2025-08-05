# Correção do Puppeteer no Vercel - Solução 2025

## Problema Original
O erro `libnss3.so: cannot open shared object file: No such file or directory` ocorria porque:
1. O Vercel tem limitações para executar Puppeteer em funções serverless
2. O pacote `@sparticuz/chromium` completo excedia o limite de 50MB
3. Dependências Linux específicas não estavam disponíveis no ambiente serverless

## Solução Implementada

### 1. Mudança para `@sparticuz/chromium-min`
- **Antes**: `@sparticuz/chromium` (inclui Chromium completo)
- **Depois**: `@sparticuz/chromium-min` (apenas configurações, sem binário)
- **Vantagem**: Reduz drasticamente o tamanho da função serverless

### 2. Chromium Hospedado Externamente
```javascript
executablePath: await chromium.executablePath(
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
)
```
- Chromium é baixado do GitHub durante a execução
- Evita problemas de dependências locais
- Mantém a função dentro do limite de 50MB

### 3. Configurações Otimizadas
```javascript
args: [
  ...chromium.args,
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
  '--disable-gpu',
  '--hide-scrollbars',
  '--disable-web-security'
]
```

### 4. Configuração do Vercel
- **Memória**: 3008MB para funções PDF
- **Timeout**: 60 segundos
- **NODE_ENV**: production (forçado)

## Arquivos Modificados

1. **package.json**: Mudança de dependência
2. **lib/puppeteer-config.js**: Nova configuração com chromium-min
3. **api/cronogramas/[id]/pdf-puppeteer.js**: Atualização da função
4. **vercel.json**: Otimizações de memória e ambiente

## Benefícios da Solução

1. ✅ **Resolve o erro libnss3.so**
2. ✅ **Mantém compatibilidade com Vercel**
3. ✅ **Reduz tamanho da função serverless**
4. ✅ **Usa versão mais recente do Chromium**
5. ✅ **Configuração robusta para 2025**

## Referências

- [Sparticuz Chromium Releases](https://github.com/Sparticuz/chromium/releases)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)

## Status
✅ **Implementado e pronto para deploy**