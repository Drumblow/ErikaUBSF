const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { PrismaClient } = require('@prisma/client');
const { generateCalendarHtml } = require('../../../lib/calendar');

const prisma = new PrismaClient();

// --- Funções Auxiliares ---
const getMonthName = (month) => ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month - 1];
const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const imageToBase64 = async (filePath) => Buffer.from(await fs.readFile(filePath)).toString('base64');

// --- Lógica de Geração de Calendário ---
function generateCalendarBody(ano, mes, atividades) {
    console.log(`[DEBUG] 1. A função generateCalendarBody recebeu ${atividades.length} atividades.`);

    const manhaAtividades = atividades.filter(a => a.diaSemana.endsWith('-MANHÃ'));
    console.log(`[DEBUG] 2. Foram filtradas ${manhaAtividades.length} atividades para o período da MANHÃ.`);

    const activitiesMap = new Map();
    manhaAtividades.forEach(ativ => {
        const dateKey = formatDate(ativ.data);
        const mapKey = `${dateKey}_${ativ.diaSemana}`;
        if (!activitiesMap.has(mapKey)) activitiesMap.set(mapKey, []);
        activitiesMap.get(mapKey).push(ativ);
    });
    console.log('[DEBUG] 3. Chaves criadas no mapa de atividades:', JSON.stringify(Array.from(activitiesMap.keys())));

    const firstDayOfMonth = new Date(Date.UTC(ano, mes - 1, 1));
    const lastDayOfMonth = new Date(Date.UTC(ano, mes, 0));
    const weeks = [];
    let currentDay = new Date(firstDayOfMonth);

    // Ajusta para o início da primeira semana (Segunda-feira)
    const dayOfWeek = currentDay.getUTCDay(); // 0 = Dom, 1 = Seg, ...
    if (dayOfWeek !== 1) {
      const adjustment = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
      currentDay.setUTCDate(currentDay.getUTCDate() + adjustment);
    }

    while (weeks.length < 6) {
        const week = {};
        const daysOrder = ['SEGUNDA-MANHÃ', 'TERÇA-MANHÃ', 'QUARTA-MANHÃ', 'QUINTA-MANHÃ', 'SEXTA-MANHÃ'];
        
        for (let i = 0; i < 5; i++) {
            const dayKey = daysOrder[i];
            if (currentDay.getUTCMonth() + 1 === mes) {
                const dateKey = formatDate(currentDay);
                const mapKey = `${dateKey}_${dayKey}`;
                week[dayKey] = {
                    date: dateKey,
                    atividades: activitiesMap.get(mapKey) || []
                };
            } else {
                 week[dayKey] = { date: '', atividades: [] };
            }
            currentDay.setUTCDate(currentDay.getUTCDate() + 1);
        }
        weeks.push(week);
        // Pula fim de semana
        currentDay.setUTCDate(currentDay.getUTCDate() + 2);
    }
    
    // --- Geração do HTML da Tabela ---
    let tableBodyHtml = '';
    
    // Filtra as semanas que não pertencem ao mês atual, removendo linhas em branco
    const filteredWeeks = weeks.filter(week => 
        Object.values(week).some(dayData => dayData.date !== '')
    );

    filteredWeeks.forEach((week, weekIndex) => {
        let dateRow = '<tr>';
        let activityRow = '<tr>';
        const daysOrder = ['SEGUNDA-MANHÃ', 'TERÇA-MANHÃ', 'QUARTA-MANHÃ', 'QUINTA-MANHÃ', 'SEXTA-MANHÃ'];
        
        daysOrder.forEach(dayKey => {
            const dayData = week[dayKey];
            dateRow += `<td class="date-cell">${dayData.date}</td>`;
            
            if (dayData.atividades.length > 0) {
                const activitiesHtml = dayData.atividades.map(ativ => {
                     const parts = ativ.descricao.split(/\\r?\\n/);
                     const title = `<strong>${parts[0]}</strong>`;
                     const rest = parts.slice(1).join('<br>');
                     return `${title}${rest ? '<br>' + rest : ''}`;
                }).join('<br><br>');
                activityRow += `<td class="activity-cell">${activitiesHtml}</td>`;
            } else {
                 const cellClass = weekIndex >= 4 ? 'empty-final-cell' : 'empty-activity-cell';
                 activityRow += `<td class="${cellClass}"></td>`;
            }
        });

        dateRow += '</tr>';
        activityRow += '</tr>';
        tableBodyHtml += dateRow + activityRow;
    });

    return tableBodyHtml;
}

// --- Nova Função para Gerar o HTML Completo ---
async function generateFullHtml(cronograma, tableBody) {
    const monthName = getMonthName(cronograma.mes).toUpperCase();
    const leftLogoPath = path.join(__dirname, '_assets', 'image3.png');
    const rightLogoPath = path.join(__dirname, '_assets', 'image2.jpg');
    const headerTitleImagePath = path.join(__dirname, '_assets', 'image1.png');

    const leftLogoBase64 = await imageToBase64(leftLogoPath);
    const rightLogoBase64 = await imageToBase64(rightLogoPath);
    const headerTitleImageBase64 = await imageToBase64(headerTitleImagePath);

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Cronograma de Atendimento - ${monthName}/${cronograma.ano}</title>
            <style>
                /* Estilos copiados e adaptados do arquivo original */
                html, body {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: Arial, sans-serif;
                    background-color: #fff;
                    -webkit-print-color-adjust: exact !important; /* Força a impressão de backgrounds no Chrome */
                    print-color-adjust: exact !important;
                    font-size: 11px; /* Fonte padrão */
                }
                .container {
                    width: 100%;
                    max-width: 1000px; /* Reduzido para caber em A4 paisagem */
                    margin: 10px auto;
                    padding: 10px;
                    border: 1px solid #ccc;
                    background-color: #fff;
                    height: 98%; /* Ocupa quase toda a altura da página */
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box; /* Garante que padding não estoure a altura */
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #000;
                }
                .header img.logo { width: 150px; }
                .header .title-block { text-align: center; }
                .header h1, .header h2 { font-size: 14px; margin: 0; }
                .info-bar {
                    display: flex;
                    justify-content: space-around;
                    padding: 5px 0;
                    background-color: #d3d3d3;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .schedule-title { text-align: center; margin: 20px 0; font-size: 1.5em; font-weight: bold; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                    flex-grow: 1; /* Faz a tabela crescer para ocupar o espaço */
                }
                tbody {
                    height: 100%; /* Faz o corpo da tabela ocupar o espaço disponível nela */
                }
                th, td {
                    border: 1px solid black;
                    padding: 5px;
                    text-align: center;
                    vertical-align: top;
                    word-wrap: break-word;
                }
                 th {
                    background-color: #ffff00; /* Amarelo */
                    font-weight: bold;
                    height: 20px; /* Altura reduzida para dias da semana */
                }
                td.date-cell { height: 20px; font-weight: bold; } /* Célula da data */
                td.activity-cell { background-color: #ffffff; } /* Fundo branco para atividades */
                td.empty-activity-cell, td.empty-final-cell {
                    background-color: #ffffff; /* Fundo branco para células vazias */
                }

                /* Evita quebras de página dentro de linhas da tabela */
                tr {
                    page-break-inside: avoid;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="data:image/png;base64,${leftLogoBase64}" alt="Logo Saúde da Família" class="logo"/>
                    <img src="data:image/png;base64,${headerTitleImageBase64}" alt="Cabeçalho Tutoia" style="height: 80px;"/>
                     <img src="data:image/jpeg;base64,${rightLogoBase64}" alt="Logo Tutoia" class="logo" style="width: 120px;"/>
                </div>
                <div class="info-bar">
                    <span>UBSF: ${cronograma.nomeUBSF || 'N/A'}</span>
                    <span>Enfermeiro(a): ${cronograma.enfermeiro || 'N/A'}</span>
                    <span>Médico(a): ${cronograma.medico || 'N/A'}</span>
                </div>
                <div class="schedule-title">CRONOGRAMA DE ATENDIMENTO ${monthName}/${cronograma.ano}</div>
                <table>
                    <thead>
                        <tr>
                            <th>SEGUNDA-FEIRA</th>
                            <th>TERÇA-FEIRA</th>
                            <th>QUARTA-FEIRA</th>
                            <th>QUINTA-FEIRA</th>
                            <th>SEXTA-FEIRA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;
}

async function initBrowser() {
  console.log('🔄 Iniciando browser...');
  console.log('🔧 Configuração para Vercel');

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });
    return browser;
  } catch (error) {
    console.error('❌ Erro ao iniciar o browser:', error);
    throw new Error(`Erro ao inicializar o Chrome: ${error.message}`);
  }
}

async function handlePdfGeneration(req, res) {
  const { id } = req.query;

  try {
    // Buscar cronograma e atividades
    const cronograma = await prisma.cronograma.findUnique({
      where: { id },
      include: {
        atividades: true
      }
    });

    if (!cronograma) {
      return res.status(404).json({
        success: false,
        message: 'Cronograma não encontrado'
      });
    }

    // Gerar HTML do calendário
    const html = generateCalendarHtml(cronograma);

    // Inicializar browser
    const browser = await initBrowser();
    const page = await browser.newPage();

    // Configurar página
    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });

    // Gerar PDF
    const pdf = await page.pdf({
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

    // Fechar browser
    await browser.close();

    // Enviar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cronograma-${cronograma.mes}-${cronograma.ano}.pdf`);
    res.send(pdf);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao gerar PDF: ${error.message}`
    });
  }
}

module.exports = {
  handler: handlePdfGeneration
};

// Exportações adicionais para testes
module.exports.generateCalendarBody = generateCalendarBody;
module.exports.generateFullHtml = generateFullHtml;
module.exports.getMonthName = getMonthName;
module.exports.formatDate = formatDate;
module.exports.imageToBase64 = imageToBase64; 