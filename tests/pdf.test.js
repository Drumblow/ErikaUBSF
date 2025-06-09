const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const path = require('path');
const fs = require('fs').promises;

// Importa as funções do arquivo pdf.js da API
const { generateCalendarBody, generateFullHtml } = require('../api/cronogramas/[id]/pdf.js');

// Inicializa o cliente Prisma
const prisma = new PrismaClient();

const cronogramaId = 'cmbo4ow1r00003cjkldne13s3'; // ID do cronograma de Junho/2025

async function testPDFGeneration() {
  try {
    console.log('🚀 Iniciando teste de geração de PDF...');

    // Buscar o cronograma do banco de dados
    const cronograma = await prisma.cronograma.findUnique({
      where: { id: cronogramaId },
      include: { atividades: true }
    });

    if (!cronograma) {
      throw new Error(`Cronograma com ID ${cronogramaId} não encontrado`);
    }

    console.log('✅ Cronograma encontrado:', cronograma.id);
    console.log(`📅 Mês/Ano: ${cronograma.mes}/${cronograma.ano}`);
    console.log(`📝 Atividades: ${cronograma.atividades.length}`);
    console.log(`🏥 UBSF: ${cronograma.nomeUBSF || 'N/A'}`);

    // 2. Gerar HTML
    console.log('🔄 Gerando HTML...');
    const { tableBodyHtml, weekCount } = generateCalendarBody(cronograma.ano, cronograma.mes, cronograma.atividades);
    const html = await generateFullHtml(cronograma, tableBodyHtml, weekCount);
    console.log('✅ HTML gerado');

    // 3. Salvar HTML temporário para debug
    const tempHtmlPath = path.join(__dirname, 'temp.html');
    await fs.writeFile(tempHtmlPath, html);
    console.log(`✅ HTML salvo em: ${tempHtmlPath}`);

    // 4. Iniciar Puppeteer e gerar PDF
    console.log('🔄 Iniciando Puppeteer...');
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: process.env.CHROME_PATH || (process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome'),
      headless: true,
      ignoreHTTPSErrors: true
    });
    
    const page = await browser.newPage();
    
    // Configurar página
    await page.setContent(html, { 
      waitUntil: ['domcontentloaded', 'networkidle0']
    });

    // Gerar PDF
    console.log('🔄 Gerando PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { 
        top: '20px', 
        right: '20px', 
        bottom: '20px', 
        left: '20px' 
      }
    });

    await browser.close();
    console.log('✅ PDF gerado com sucesso');

    // 5. Salvar PDF para verificação
    const outputPath = path.join(__dirname, 'output.pdf');
    await fs.writeFile(outputPath, pdfBuffer);
    console.log(`✅ PDF salvo em: ${outputPath}`);

    return {
      success: true,
      message: 'PDF gerado com sucesso',
      data: {
        cronogramaId: cronograma.id,
        mes: cronograma.mes,
        ano: cronograma.ano,
        nomeUBSF: cronograma.nomeUBSF
      }
    };

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testPDFGeneration().then(result => {
  console.log('\n📋 Resultado final:', result.success ? '✅ SUCESSO' : '❌ FALHA');
  console.log('Mensagem:', result.message);
  if (result.data) {
    console.log('Cronograma testado:', {
      id: result.data.cronogramaId,
      mes: result.data.mes,
      ano: result.data.ano,
      nomeUBSF: result.data.nomeUBSF
    });
  }
  process.exit(result.success ? 0 : 1);
}); 