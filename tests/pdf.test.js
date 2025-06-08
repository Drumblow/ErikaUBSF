const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

// Importa as funções do arquivo pdf.js
const { 
  generateCalendarBody, 
  generateFullHtml,
  getMonthName 
} = require('../api/cronogramas/[id]/pdf.js');

// Inicializa o cliente Prisma
const prisma = new PrismaClient();

async function testPDFGeneration() {
  try {
    console.log('🚀 Iniciando teste de geração de PDF...');

    // 1. Buscar um cronograma existente
    const cronograma = await prisma.cronograma.findFirst({
      include: {
        atividades: {
          orderBy: { data: 'asc' }
        }
      }
    });

    if (!cronograma) {
      throw new Error('❌ Nenhum cronograma encontrado no banco de dados');
    }

    console.log('✅ Cronograma encontrado:', cronograma.id);
    console.log(`📅 Mês/Ano: ${cronograma.mes}/${cronograma.ano}`);
    console.log(`📝 Atividades: ${cronograma.atividades.length}`);
    console.log(`🏥 UBSF: ${cronograma.nomeUBSF || 'N/A'}`);

    // 2. Verificar se as imagens existem
    const assetsPath = path.join(__dirname, '../api/cronogramas/[id]/_assets');
    const requiredImages = ['image1.png', 'image2.jpg', 'image3.png'];
    
    for (const image of requiredImages) {
      const imagePath = path.join(assetsPath, image);
      try {
        await fs.access(imagePath);
        console.log(`✅ Imagem encontrada: ${image}`);
      } catch (error) {
        throw new Error(`❌ Imagem não encontrada: ${image} (procurada em ${imagePath})`);
      }
    }

    // 3. Gerar o corpo da tabela
    console.log('🔄 Gerando corpo da tabela...');
    const tableBody = generateCalendarBody(cronograma.ano, cronograma.mes, cronograma.atividades);
    console.log('✅ Corpo da tabela gerado');

    // 4. Gerar HTML completo
    console.log('🔄 Gerando HTML completo...');
    const html = await generateFullHtml(cronograma, tableBody);
    console.log('✅ HTML completo gerado');

    // 5. Salvar HTML temporário para debug
    const tempHtmlPath = path.join(__dirname, 'temp.html');
    await fs.writeFile(tempHtmlPath, html);
    console.log(`✅ HTML salvo em: ${tempHtmlPath}`);

    // 6. Iniciar Puppeteer e gerar PDF
    console.log('🔄 Iniciando Puppeteer...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Configurar página
    await page.emulateMediaType('screen');
    await page.setContent(html, { waitUntil: 'load' });

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
      },
      preferCSSPageSize: true
    });

    await browser.close();
    console.log('✅ PDF gerado com sucesso');

    // 7. Salvar PDF para verificação
    const outputPath = path.join(__dirname, 'output.pdf');
    await fs.writeFile(outputPath, pdfBuffer);
    console.log(`✅ PDF salvo em: ${outputPath}`);

    // 8. Converter para base64 (como na API)
    const pdfBase64 = pdfBuffer.toString('base64');
    console.log('✅ PDF convertido para base64');

    return {
      success: true,
      message: 'PDF gerado com sucesso',
      data: {
        pdfBase64,
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