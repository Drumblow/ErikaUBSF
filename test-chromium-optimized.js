/**
 * Teste da configuração otimizada do @sparticuz/chromium
 * Baseado na documentação oficial: https://github.com/Sparticuz/chromium
 */

const { getBrowser } = require('./lib/puppeteer-config');

async function testChromiumOptimized() {
  console.log('🧪 Testando configuração otimizada do @sparticuz/chromium...');
  
  try {
    // Simular ambiente de produção
    process.env.NODE_ENV = 'production';
    
    console.log('📦 Iniciando browser com configuração oficial...');
    const browser = await getBrowser();
    
    console.log('🌐 Criando nova página...');
    const page = await browser.newPage();
    
    console.log('🔗 Navegando para página de teste...');
    await page.goto('https://example.com');
    
    console.log('📄 Obtendo título da página...');
    const title = await page.title();
    console.log(`✅ Título obtido: "${title}"`);
    
    console.log('📊 Gerando PDF de teste...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    console.log(`📋 PDF gerado com sucesso! Tamanho: ${pdf.length} bytes`);
    
    await browser.close();
    console.log('🎉 Teste concluído com sucesso!');
    
    return {
      success: true,
      title,
      pdfSize: pdf.length,
      message: 'Configuração @sparticuz/chromium funcionando perfeitamente!'
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testChromiumOptimized()
    .then(result => {
      console.log('\n📋 Resultado do teste:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { testChromiumOptimized };