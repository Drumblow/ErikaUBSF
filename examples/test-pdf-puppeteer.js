/**
 * Exemplo simples para testar a geração de PDF com Puppeteer
 * Este exemplo não depende do banco de dados
 */

const { createBrowser, getPDFOptions } = require('../lib/puppeteer-config');
const fs = require('fs');
const path = require('path');

async function testPuppeteerPDF() {
  console.log('🚀 Iniciando teste do Puppeteer PDF...');
  
  try {
    // HTML de exemplo (similar ao gerado pelo sistema)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cronograma UBSF - Teste</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 16px;
            color: #7f8c8d;
          }
          .calendar-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .calendar-table th,
          .calendar-table td {
            border: 1px solid #bdc3c7;
            padding: 8px;
            text-align: center;
            vertical-align: top;
          }
          .calendar-table th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
          }
          .day-header {
            background-color: #ecf0f1;
            font-weight: bold;
          }
          .activity {
            background-color: #e8f5e8;
            margin: 2px 0;
            padding: 4px;
            border-radius: 3px;
            font-size: 12px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">CRONOGRAMA DE ATIVIDADES - UBSF</div>
          <div class="subtitle">UBSF Teste - Janeiro 2024</div>
        </div>
        
        <table class="calendar-table">
          <thead>
            <tr>
              <th>Período</th>
              <th>Segunda</th>
              <th>Terça</th>
              <th>Quarta</th>
              <th>Quinta</th>
              <th>Sexta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="day-header">Manhã<br>(07:00-12:00)</td>
              <td>
                <div class="activity">Consultas médicas<br>Dr. João</div>
                <div class="activity">Acolhimento<br>Enfermeira Maria</div>
              </td>
              <td>
                <div class="activity">Vacinação<br>Enfermeira Ana</div>
              </td>
              <td>
                <div class="activity">Pré-natal<br>Dra. Carla</div>
              </td>
              <td>
                <div class="activity">Consultas pediátricas<br>Dr. Pedro</div>
              </td>
              <td>
                <div class="activity">Planejamento familiar<br>Enfermeira Lucia</div>
              </td>
            </tr>
            <tr>
              <td class="day-header">Tarde<br>(13:00-17:00)</td>
              <td>
                <div class="activity">Curativos<br>Técnico José</div>
              </td>
              <td>
                <div class="activity">Consultas médicas<br>Dr. João</div>
              </td>
              <td>
                <div class="activity">Grupo de hipertensos<br>Enfermeira Maria</div>
              </td>
              <td>
                <div class="activity">Visitas domiciliares<br>ACS Equipe</div>
              </td>
              <td>
                <div class="activity">Reunião de equipe<br>Todos</div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          <p>Sistema de Cronogramas UBSF - Versão com Puppeteer</p>
        </div>
      </body>
      </html>
    `;

    console.log('📄 Criando browser...');
    const browser = await createBrowser();
    
    console.log('🌐 Criando página...');
    const page = await browser.newPage();
    
    // Configurar viewport para A4 landscape
    await page.setViewport({
      width: 1123,
      height: 794,
      deviceScaleFactor: 1,
    });

    console.log('📝 Definindo conteúdo HTML...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('🖨️ Gerando PDF...');
    const pdfOptions = getPDFOptions();
    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    // Salvar PDF de exemplo
    const outputPath = path.join(__dirname, 'cronograma-teste-puppeteer.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log('✅ PDF gerado com sucesso!');
    console.log(`📁 Arquivo salvo em: ${outputPath}`);
    console.log(`📊 Tamanho do PDF: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    return {
      success: true,
      pdfSize: pdfBuffer.length,
      outputPath: outputPath
    };

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testPuppeteerPDF()
    .then(result => {
      if (result.success) {
        console.log('🎉 Teste concluído com sucesso!');
        process.exit(0);
      } else {
        console.log('💥 Teste falhou:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Erro inesperado:', error);
      process.exit(1);
    });
}

module.exports = { testPuppeteerPDF };