# Teste de Geração de PDF

Este diretório contém testes para a funcionalidade de geração de PDF do Cronograma UBSF App.

## Pré-requisitos

1. Node.js instalado (v20.x)
2. Banco de dados PostgreSQL configurado (via Neon)
3. Variáveis de ambiente configuradas no `.env`
4. Chrome instalado localmente (para testes locais)
5. Dependências instaladas:
   ```bash
   npm install
   ```

## Como Executar o Teste

1. Execute o teste:
   ```bash
   npm run test:pdf
   ```

2. Verifique o resultado:
   - O teste irá gerar dois arquivos:
     - `temp.html`: HTML gerado para debug
     - `output.pdf`: PDF final gerado
   - O console mostrará o progresso detalhado
   - Em caso de sucesso, você verá os detalhes do cronograma testado

## Estrutura do Teste

O teste `pdf.test.js` executa os seguintes passos:

1. Busca um cronograma no banco de dados
2. Gera o HTML do calendário usando a função `generateCalendarHtml`
3. Salva o HTML para debug
4. Converte para PDF usando Puppeteer
5. Salva o PDF para verificação

## Troubleshooting

Se o teste falhar, verifique:

1. Se o banco de dados está acessível (variável DATABASE_URL)
2. Se existe pelo menos um cronograma no banco
3. Se o Chrome está instalado no caminho padrão:
   - Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - Linux: `/usr/bin/google-chrome`
4. Se todas as dependências estão instaladas
5. Se a variável CHROME_PATH está configurada (opcional)

## Estrutura do PDF Gerado

O PDF gerado inclui:

1. **Cabeçalho**
   - Logo Saúde da Família (esquerda)
   - Título Tutoia (centro)
   - Logo Tutoia (direita)

2. **Barra de Informações**
   - Nome da UBSF
   - Nome do Enfermeiro
   - Nome do Médico

3. **Título do Cronograma**
   - Mês e Ano em destaque

4. **Tabela de Atividades**
   - Colunas para cada dia da semana
   - Linhas alternando entre datas e atividades
   - Células vazias com formatação específica

## Formato do Banco de Dados

O teste espera encontrar:

1. **Tabela Cronograma**
   - `id`: String (CUID)
   - `mes`: Int (1-12)
   - `ano`: Int
   - `nomeUBSF`: String
   - `enfermeiro`: String
   - `medico`: String

2. **Tabela Atividade**
   - `id`: String (CUID)
   - `cronogramaId`: String (FK)
   - `data`: DateTime
   - `diaSemana`: String (ex: "SEGUNDA-MANHÃ")
   - `descricao`: String

## Logs do Teste

O teste gera logs detalhados no console:

```
🚀 Iniciando teste de geração de PDF...
✅ Cronograma encontrado: [ID]
📅 Mês/Ano: [MES]/[ANO]
📝 Atividades: [QUANTIDADE]
🔄 Gerando HTML...
✅ HTML gerado
✅ HTML salvo em: [CAMINHO]
🔄 Iniciando Puppeteer...
🔄 Gerando PDF...
✅ PDF gerado com sucesso
✅ PDF salvo em: [CAMINHO]
``` 