const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const fs = require('fs').promises;
const path = require('path');
const { errorResponse, corsHeaders, isValidId } = require('../../../lib/utils');
const { verificarAuthAsPromise } = require('../../utils/auth');

const prisma = new PrismaClient();

const { getBrowser, getPDFOptions } = require('../../../lib/puppeteer-config');

// --- Funções Auxiliares (reutilizadas do arquivo original) ---
const getMonthName = (month) => ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month - 1];

const formatDate = (date) => {
  const dataUTC = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  return format(dataUTC, 'dd/MM/yyyy', { locale: ptBR });
};

const imageToBase64 = async (filePath) => {
  try {
    return Buffer.from(await fs.readFile(filePath)).toString('base64');
  } catch (error) {
    console.warn('Erro ao carregar imagem:', filePath, error.message);
    return '';
  }
};

// Função de geração de calendário (importada do arquivo original)
function generateCalendarBody(ano, mes, atividades) {
  console.log(`[DEBUG] Gerando calendário para ${mes}/${ano} com ${atividades.length} atividades`);

  // Pré-processamento das atividades
  const atividadesProcessadas = [];
  const atividadesPorData = new Map();

  atividades.forEach(ativ => {
    const dataKey = format(new Date(ativ.data), 'yyyy-MM-dd');
    if (!atividadesPorData.has(dataKey)) {
      atividadesPorData.set(dataKey, []);
    }
    atividadesPorData.get(dataKey).push(ativ);
  });

  for (const [dataKey, ativsDoMesmoDia] of atividadesPorData.entries()) {
    ativsDoMesmoDia.sort((a, b) => a.id - b.id);
    let atividadeCombinada = null;
    
    for (const ativ of ativsDoMesmoDia) {
      if (!atividadeCombinada) {
        atividadeCombinada = { ...ativ };
        continue;
      }

      const descricaoAtual = ativ.descricao.trim();
      if (descricaoAtual.startsWith('(') || 
          descricaoAtual.charAt(0) === descricaoAtual.charAt(0).toLowerCase()) {
        atividadeCombinada.descricao = `${atividadeCombinada.descricao}\n${descricaoAtual}`;
      } else {
        atividadesProcessadas.push(atividadeCombinada);
        atividadeCombinada = { ...ativ };
      }
    }

    if (atividadeCombinada) {
      atividadesProcessadas.push(atividadeCombinada);
    }
  }

  // Filtrar apenas dias úteis
  const atividadesFiltradas = atividadesProcessadas.filter(ativ => {
    const dataAtividade = new Date(ativ.data);
    const dayOfWeek = dataAtividade.getUTCDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  });

  // Organizar atividades por data e dia da semana
  const activitiesMap = new Map();
  atividadesFiltradas.forEach(ativ => {
    const dataAtividade = new Date(ativ.data);
    const dataUTC = new Date(Date.UTC(
      dataAtividade.getUTCFullYear(),
      dataAtividade.getUTCMonth(),
      dataAtividade.getUTCDate()
    ));
    const dateKey = formatDate(dataUTC);
    const mapKey = `${dateKey}_${ativ.diaSemana}`;
    if (!activitiesMap.has(mapKey)) {
      activitiesMap.set(mapKey, []);
    }
    activitiesMap.get(mapKey).push(ativ);
  });

  // Gerar semanas do calendário
  const firstDayOfMonth = new Date(Date.UTC(ano, mes - 1, 1));
  const lastDayOfMonth = new Date(Date.UTC(ano, mes, 0));
  const weeks = [];
  let currentDay = firstDayOfMonth;

  // Ajustar para início da semana (Segunda-feira)
  const dayOfWeek = currentDay.getUTCDay();
  if (dayOfWeek !== 1) {
    const adjustment = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
    currentDay = new Date(Date.UTC(
      currentDay.getUTCFullYear(),
      currentDay.getUTCMonth(),
      currentDay.getUTCDate() + adjustment
    ));
  }

  while (currentDay <= lastDayOfMonth) {
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
      currentDay = new Date(Date.UTC(
        currentDay.getUTCFullYear(),
        currentDay.getUTCMonth(),
        currentDay.getUTCDate() + 1
      ));
    }
    weeks.push(week);
    // Pular fim de semana
    currentDay = new Date(Date.UTC(
      currentDay.getUTCFullYear(),
      currentDay.getUTCMonth(),
      currentDay.getUTCDate() + 2
    ));
  }
  
  // Gerar HTML da tabela
  let tableBodyHtml = '';
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
          return ativ.descricao
            .split('\n')
            .map(line => line.trim())
            .join('<br>');
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

  return { tableBodyHtml, weekCount: filteredWeeks.length };
}

// Função para gerar HTML completo
async function generateFullHtml(cronograma, tableBody, weekCount) {
  const monthName = getMonthName(cronograma.mes).toUpperCase();
  
  let leftLogoBase64 = '';
  let rightLogoBase64 = '';
  let headerTitleImageBase64 = '';
  
  try {
    const leftLogoPath = path.join(__dirname, '_assets', 'image3.png');
    const rightLogoPath = path.join(__dirname, '_assets', 'image2.jpg');
    const headerTitleImagePath = path.join(__dirname, '_assets', 'image1.png');

    leftLogoBase64 = await imageToBase64(leftLogoPath);
    rightLogoBase64 = await imageToBase64(rightLogoPath);
    headerTitleImageBase64 = await imageToBase64(headerTitleImagePath);
  } catch (error) {
    console.warn('Erro ao carregar imagens:', error.message);
  }

  let sizeClass = 'size-normal';
  if (weekCount <= 3) {
    sizeClass = 'size-xlarge';
  } else if (weekCount === 4) {
    sizeClass = 'size-large';
  } else if (weekCount >= 6) {
    sizeClass = 'size-small';
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Cronograma de Atendimento - ${monthName}/${cronograma.ano}</title>
        <style>
            :root {
                --font-base: 14px;
                --font-header: 15px;
                --font-cell: 13px;
                --logo-height: 62px;
                --title-img-height: 72px;
                --date-cell-height: 22px;
                --activity-cell-height: 85px;
                --padding-base: 5px;
            }
            body.size-xlarge {
                --font-base: 18px;
                --font-header: 20px;
                --font-cell: 17px;
                --logo-height: 82px;
                --title-img-height: 95px;
                --date-cell-height: 30px;
                --activity-cell-height: 140px;
                --padding-base: 8px;
            }
            body.size-large {
                --font-base: 16px;
                --font-header: 17px;
                --font-cell: 15px;
                --logo-height: 72px;
                --title-img-height: 85px;
                --date-cell-height: 25px;
                --activity-cell-height: 110px;
                --padding-base: 6px;
            }
            body.size-small {
                --font-base: 11px;
                --font-header: 12px;
                --font-cell: 10px;
                --logo-height: 50px;
                --title-img-height: 55px;
                --date-cell-height: 18px;
                --activity-cell-height: 65px;
                --padding-base: 3px;
            }
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 6px;
                font-size: var(--font-base);
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .header {
                text-align: center;
                margin-bottom: 6px;
            }
            .header img.logo {
                height: var(--logo-height);
                margin: 0 8px;
            }
            .header img.header-title-img {
                height: var(--title-img-height);
            }
            .header-title {
                font-size: var(--font-header);
                font-weight: bold;
                margin: 2px 0;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
                padding: 0 16px;
                font-size: var(--font-header);
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
            }
            th, td {
                border: 1px solid black;
                padding: var(--padding-base);
                text-align: center;
                vertical-align: top;
            }
            th {
                background-color: #ffff00 !important;
                font-weight: bold;
            }
            .date-cell {
                background-color: #ffff00 !important;
                font-weight: bold;
                font-size: var(--font-cell);
                padding: 2px;
                height: var(--date-cell-height);
            }
            .activity-cell {
                height: var(--activity-cell-height);
                font-size: var(--font-cell);
                padding: 2px;
                text-align: center;
                vertical-align: middle;
            }
            .empty-activity-cell {
                height: var(--activity-cell-height);
            }
            .empty-final-cell {
                height: var(--activity-cell-height);
            }
            @media print {
                body { margin: 0; }
                .header, .info-row, table { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body class="${sizeClass}">
        <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                ${leftLogoBase64 ? `<img src="data:image/png;base64,${leftLogoBase64}" alt="Logo Saúde" class="logo">` : '<div class="logo" style="width: 62px;"></div>'}
                <div style="flex: 1; text-align: center;">
                    ${headerTitleImageBase64 ? `<img src="data:image/png;base64,${headerTitleImageBase64}" alt="Título" class="header-title-img">` : '<div class="header-title">CRONOGRAMA DE ATENDIMENTO</div>'}
                </div>
                ${rightLogoBase64 ? `<img src="data:image/jpeg;base64,${rightLogoBase64}" alt="Logo Tutóia" class="logo">` : '<div class="logo" style="width: 62px;"></div>'}
            </div>
        </div>
        <div class="info-row">
            <div>UBSF: ${cronograma.nomeUBSF}</div>
            <div>Enfermeira(o): ${cronograma.enfermeiro}</div>
            <div>Médico(a): ${cronograma.medico}</div>
        </div>
        <div style="text-align: center; margin: 3px 0; font-weight: bold;">
            CRONOGRAMA DE ATENDIMENTO ${monthName}/${cronograma.ano}
        </div>
        <table>
            <thead>
                <tr>
                    <th>SEGUNDA – MANHÃ</th>
                    <th>TERÇA – MANHÃ</th>
                    <th>QUARTA – MANHÃ</th>
                    <th>QUINTA – MANHÃ</th>
                    <th>SEXTA – MANHÃ</th>
                </tr>
            </thead>
            <tbody>
                ${tableBody}
            </tbody>
        </table>
    </body>
    </html>
  `;
}

// Função para gerar PDF com Puppeteer
async function generatePdfWithPuppeteer(html) {
  let browser = null;
  
  try {
    // Criar browser usando configuração otimizada
    browser = await getBrowser();
    const page = await browser.newPage();
    
    // Configurar viewport para A4 landscape
    await page.setViewport({
      width: 1123, // A4 landscape width em pixels (96 DPI)
      height: 794,  // A4 landscape height em pixels (96 DPI)
      deviceScaleFactor: 1,
    });

    // Carregar HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Gerar PDF com configurações otimizadas
    const pdfOptions = getPDFOptions();
    const pdfBuffer = await page.pdf(pdfOptions);

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Handler principal
module.exports = async (req, res) => {
  if (corsHeaders(req, res)) return;

  try {
    await verificarAuthAsPromise(req);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 401);
  }

  try {
    const { id: cronogramaId } = req.query;

    if (!isValidId(cronogramaId)) {
      return errorResponse(res, 'ID do cronograma inválido.', 400);
    }

    if (req.method !== 'POST') {
      return errorResponse(res, 'Método não permitido.', 405);
    }
    
    return await gerarPdfPuppeteer(req, res, cronogramaId);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return errorResponse(res, 'Erro interno do servidor ao gerar PDF.', 500);
  }
};

async function gerarPdfPuppeteer(req, res, cronogramaId) {
  try {
    // Buscar cronograma
    const cronograma = await prisma.cronograma.findUnique({
      where: { id: cronogramaId },
      include: {
        atividades: {
          orderBy: {
            data: 'asc'
          }
        }
      }
    });

    if (!cronograma) {
      return errorResponse(res, 'Cronograma não encontrado', 404);
    }
    
    // Verificar permissão
    if (cronograma.usuarioId !== req.usuario.id) {
      return errorResponse(res, 'Sem permissão para acessar este recurso.', 403);
    }

    // Gerar HTML
    const { tableBodyHtml, weekCount } = generateCalendarBody(cronograma.ano, cronograma.mes, cronograma.atividades);
    const html = await generateFullHtml(cronograma, tableBodyHtml, weekCount);

    // Gerar PDF com Puppeteer
    const pdfBuffer = await generatePdfWithPuppeteer(html);

    // Converter para base64
    const pdfBase64 = pdfBuffer.toString('base64');

    return res.status(200).json({
      success: true,
      message: 'PDF gerado com sucesso',
      data: {
        pdfBase64
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return errorResponse(res, 'Erro ao gerar PDF: ' + error.message, 500);
  }
}

module.exports.generateCalendarBody = generateCalendarBody;
module.exports.generateFullHtml = generateFullHtml;
module.exports.generatePdfWithPuppeteer = generatePdfWithPuppeteer;