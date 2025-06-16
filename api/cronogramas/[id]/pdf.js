const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { errorResponse, corsHeaders } = require('../../../lib/utils');
const { verificarAuth } = require('../../utils/auth');

const prisma = new PrismaClient();

// Configuração PDFShift
const PDFSHIFT_API_KEY = 'sk_d7fe681e6b5b8272908538596da2d8356bd5a898';
const PDFSHIFT_URL = 'https://api.pdfshift.io/v3/convert/pdf';

// --- Funções Auxiliares ---
const getMonthName = (month) => ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month - 1];
const formatDate = (date) => {
  const dataUTC = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  return format(dataUTC, 'dd/MM/yyyy', { locale: ptBR });
};
const imageToBase64 = async (filePath) => Buffer.from(await fs.readFile(filePath)).toString('base64');

// --- Lógica de Geração de Calendário ---
function generateCalendarBody(ano, mes, atividades) {
    console.log(`[DEBUG] 1. A função generateCalendarBody recebeu ${atividades.length} atividades.`);

    // Pré-processamento das atividades para combinar descrições separadas por enter
    const atividadesProcessadas = [];
    const atividadesPorData = new Map();

    // Primeiro, agrupa as atividades por data
    atividades.forEach(ativ => {
        const dataKey = format(new Date(ativ.data), 'yyyy-MM-dd');
        if (!atividadesPorData.has(dataKey)) {
            atividadesPorData.set(dataKey, []);
        }
        atividadesPorData.get(dataKey).push(ativ);
    });

    // Depois, processa cada grupo de atividades
    for (const [dataKey, ativsDoMesmoDia] of atividadesPorData.entries()) {
        // Ordena as atividades do dia pela ordem de criação ou ID
        ativsDoMesmoDia.sort((a, b) => a.id - b.id);

        let atividadeCombinada = null;
        
        for (const ativ of ativsDoMesmoDia) {
            if (!atividadeCombinada) {
                atividadeCombinada = { ...ativ };
                continue;
            }

            // Se a atividade atual parece ser uma continuação da anterior
            // (começa com parênteses ou está em minúsculo)
            const descricaoAtual = ativ.descricao.trim();
            if (descricaoAtual.startsWith('(') || 
                descricaoAtual.charAt(0) === descricaoAtual.charAt(0).toLowerCase()) {
                // Combina com a atividade anterior
                atividadeCombinada.descricao = `${atividadeCombinada.descricao}\n${descricaoAtual}`;
            } else {
                // É uma nova atividade independente
                atividadesProcessadas.push(atividadeCombinada);
                atividadeCombinada = { ...ativ };
            }
        }

        if (atividadeCombinada) {
            atividadesProcessadas.push(atividadeCombinada);
        }
    }

    console.log(`[DEBUG] 2. Após processamento, temos ${atividadesProcessadas.length} atividades.`);

    // Filtra apenas dias úteis
    const atividadesFiltradas = atividadesProcessadas.filter(ativ => {
        const dataAtividade = new Date(ativ.data);
        const dayOfWeek = dataAtividade.getUTCDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6;
    });

    // Organiza as atividades por data e dia da semana
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

    console.log('[DEBUG] 3. Chaves criadas no mapa de atividades:', 
        JSON.stringify(Array.from(activitiesMap.keys())));

    const firstDayOfMonth = new Date(Date.UTC(ano, mes - 1, 1));
    const lastDayOfMonth = new Date(Date.UTC(ano, mes, 0));
    const weeks = [];
    let currentDay = firstDayOfMonth;

    // Ajusta para o início da primeira semana (Segunda-feira)
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
        // Pula fim de semana
        currentDay = new Date(Date.UTC(
            currentDay.getUTCFullYear(),
            currentDay.getUTCMonth(),
            currentDay.getUTCDate() + 2
        ));
    }
    
    // --- Geração do HTML da Tabela ---
    let tableBodyHtml = '';
    
    // Filtra as semanas que não pertencem ao mês atual
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
                    // Formata a descrição para manter a estrutura visual
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

// --- Nova Função para Gerar o HTML Completo ---
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
        console.log('[DEBUG] Imagens carregadas com sucesso');
    } catch (error) {
        console.warn('[WARNING] Erro ao carregar imagens:', error.message);
        // Continua sem as imagens - elas são opcionais
    }

    let sizeClass = 'size-normal'; // 5 semanas
    if (weekCount <= 3) {
        sizeClass = 'size-xlarge'; // 3 semanas ou menos - texto bem maior
    } else if (weekCount === 4) {
        sizeClass = 'size-large'; // 4 semanas - texto médio/grande
    } else if (weekCount >= 6) {
        sizeClass = 'size-small'; // 6+ semanas - texto bem pequeno
    }
    
    console.log(`[DEBUG] Cronograma com ${weekCount} semanas - Usando classe: ${sizeClass}`);

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Cronograma de Atendimento - ${monthName}/${cronograma.ano}</title>
            <style>
                :root {
                    /* Tamanhos para 5 semanas (normal) */
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
                    /* Tamanhos para 3 semanas ou menos (bem maior) */
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
                    /* Tamanhos para 4 semanas (médio/grande) */
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
                    /* Tamanhos para 6+ semanas (bem menor) */
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
                    background-color: #ffff00;
                    font-weight: bold;
                }
                .date-cell {
                    background-color: #ffff00;
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
                .cell-content {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .date-header {
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .activity-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
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

// --- Handler Principal ---
module.exports = async (req, res) => {
  // Configurar CORS
  if (corsHeaders(req, res)) return;

  // Verificar se é método POST
  if (req.method !== 'POST') {
    return errorResponse(res, 'Método não permitido. Use POST para gerar PDF.', 405);
  }

  // Verificar autenticação
  verificarAuth(req, res, async () => {
    try {
      const { id } = req.query;

      if (!id) {
        return errorResponse(res, 'ID do cronograma é obrigatório', 400);
      }

      // Buscar cronograma
      const cronograma = await prisma.cronograma.findUnique({
        where: { id },
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

      // Verificar se o usuário tem permissão para acessar este cronograma
      if (cronograma.usuarioId && cronograma.usuarioId !== req.usuario.id) {
        return errorResponse(res, 'Sem permissão para acessar este cronograma', 403);
      }

      console.log('[DEBUG] Iniciando geração de PDF para cronograma:', id);
      
      // Gerar HTML
      const { tableBodyHtml, weekCount } = generateCalendarBody(cronograma.ano, cronograma.mes, cronograma.atividades);
      console.log('[DEBUG] Corpo da tabela gerado, semanas:', weekCount);
      
      const html = await generateFullHtml(cronograma, tableBodyHtml, weekCount);
      console.log('[DEBUG] HTML completo gerado, tamanho:', html.length);

      // Gerar PDF usando PDFShift
      console.log('[DEBUG] Enviando HTML para PDFShift...');
      const pdfShiftResponse = await axios.post(PDFSHIFT_URL, {
        source: html,
        landscape: true,
        format: 'A4',
        margin: '20px',
        use_print: true,
        timeout: 30
      }, {
        headers: {
          'X-API-Key': PDFSHIFT_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 35000 // 35 segundos
      });

      console.log('[DEBUG] PDF gerado pelo PDFShift, tamanho:', pdfShiftResponse.data.length);

      // Converter para base64
      const pdfBase64 = Buffer.from(pdfShiftResponse.data).toString('base64');
      console.log('[DEBUG] PDF convertido para base64, tamanho:', pdfBase64.length);

      // Retornar resposta
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
      return errorResponse(res, 'Erro ao gerar PDF', 500);
    }
  });
};

module.exports.generateCalendarBody = generateCalendarBody;
module.exports.generateFullHtml = generateFullHtml;
module.exports.getMonthName = getMonthName;
module.exports.formatDate = formatDate;
module.exports.imageToBase64 = imageToBase64; 