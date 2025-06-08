# Teste de Geração de PDF

Este diretório contém testes para a funcionalidade de geração de PDF do Cronograma UBSF App.

## Pré-requisitos

1. Node.js instalado (v18+)
2. Banco de dados PostgreSQL configurado (via Neon)
3. Variáveis de ambiente configuradas no `.env`
4. Dependências instaladas:
   ```bash
   npm install puppeteer @prisma/client
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
2. Gera o corpo da tabela do calendário
3. Gera o HTML completo com cabeçalho e estilos
4. Salva o HTML para debug
5. Converte para PDF usando Puppeteer
6. Salva o PDF para verificação
7. Converte o PDF para base64

## Troubleshooting

Se o teste falhar, verifique:

1. Se o banco de dados está acessível (variável DATABASE_URL)
2. Se existe pelo menos um cronograma no banco
3. Se as imagens existem em `api/cronogramas/[id]/_assets/`:
   - `image1.png`
   - `image2.jpg`
   - `image3.png`
4. Se todas as dependências estão instaladas
5. Se o Puppeteer consegue executar no seu ambiente

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
🔄 Gerando corpo da tabela...
✅ Corpo da tabela gerado
🔄 Gerando HTML completo...
✅ HTML completo gerado
✅ HTML salvo em: [CAMINHO]
🔄 Iniciando Puppeteer...
🔄 Gerando PDF...
✅ PDF gerado com sucesso
✅ PDF salvo em: [CAMINHO]
✅ PDF convertido para base64
``` 