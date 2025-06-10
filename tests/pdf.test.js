const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

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

    // 2. Chamar a API para gerar o PDF
    const API_URL = 'http://localhost:3000';
    console.log('🔄 Chamando API para gerar PDF...');
    const response = await axios.post(`${API_URL}/api/cronogramas/${cronogramaId}/pdf`);
    if (!response.data.success) {
      throw new Error(`Erro na API: ${response.data.message}`);
    }
    const pdfBase64 = response.data.data.pdfBase64;
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // 3. Salvar PDF para verificação
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