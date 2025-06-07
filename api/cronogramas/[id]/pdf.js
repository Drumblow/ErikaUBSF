const { prisma } = require('../../../lib/database');
const { 
  successResponse, 
  errorResponse, 
  corsHeaders, 
  isValidId 
} = require('../../../lib/utils');
const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');
const { readdirSync } = require('fs');

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
    const leftLogoPath = path.join(__dirname, '../../CRONOGRAMA MES JUNHO', 'images', 'image3.png');
    const rightLogoPath = path.join(__dirname, '../../CRONOGRAMA MES JUNHO', 'images', 'image2.jpg');
    const headerTitleImagePath = path.join(__dirname, '../../CRONOGRAMA MES JUNHO', 'images', 'image1.png');

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

// --- Handler da API ---
module.exports = async (req, res) => {
    if (corsHeaders(req, res)) return;
    if (req.method !== 'POST') return errorResponse(res, 'Método não permitido', 405);

    try {
        const { id } = req.query;
        if (!isValidId(id)) return errorResponse(res, 'ID do cronograma inválido', 400);

        const cronograma = await prisma.cronograma.findUnique({
            where: { id },
            include: { atividades: { orderBy: { data: 'asc' } } },
        });

        if (!cronograma) return errorResponse(res, `Cronograma com ID '${id}' não foi encontrado.`, 404);

        // --- Gerar o HTML dinamicamente ---
        const tableBody = generateCalendarBody(cronograma.ano, cronograma.mes, cronograma.atividades);
        const html = await generateFullHtml(cronograma, tableBody);

        // --- Geração do PDF ---
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        
        // Emular media type de tela para garantir que os estilos sejam aplicados corretamente
        await page.emulateMediaType('screen');

        // Usar page.setContent, que é ideal para strings de HTML
        await page.setContent(html, { waitUntil: 'load' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true, // Mudar para modo paisagem
            printBackground: true,
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            preferCSSPageSize: true // Usa o tamanho da página definido no CSS se houver
        });
        
        // --- RESPOSTA CONFORME ESPECIFICADO PARA O FRONTEND ---
        const pdfBase64 = pdfBuffer.toString('base64');
        return successResponse(res, { pdfBase64 }, "PDF gerado com sucesso.");

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        return errorResponse(res, 'Erro interno ao gerar o PDF.', 500);
    }
}; 