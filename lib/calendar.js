const fs = require('fs');
const path = require('path');
const { format, startOfMonth, endOfMonth, addDays, getDay } = require('date-fns');
const { ptBR } = require('date-fns/locale');

// Função para converter imagem em base64
async function imageToBase64(imagePath) {
  try {
    const imageBuffer = await fs.promises.readFile(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Erro ao carregar imagem ${imagePath}:`, error);
    return '';
  }
}

async function generateCalendarHtml(cronograma) {
  const { mes, ano, nomeUBSF, enfermeiro, medico, atividades = [] } = cronograma;

  // Carregar imagens
  const assetsPath = path.join(__dirname, '../api/cronogramas/[id]/_assets');
  const leftLogoBase64 = await imageToBase64(path.join(assetsPath, 'image3.png'));
  const centerLogoBase64 = await imageToBase64(path.join(assetsPath, 'image1.png'));
  const rightLogoBase64 = await imageToBase64(path.join(assetsPath, 'image2.jpg'));

  console.log(`[DEBUG] 1. A função generateCalendarBody recebeu ${atividades.length} atividades.`);

  // Função para gerar o cabeçalho da tabela
  function generateTableHeader() {
    return `
      <tr>
        <th><div class="header-content">SEGUNDA – MANHÃ</div></th>
        <th><div class="header-content">TERÇA – MANHÃ</div></th>
        <th><div class="header-content">QUARTA – MANHÃ</div></th>
        <th><div class="header-content">QUINTA – MANHÃ</div></th>
        <th><div class="header-content">SEXTA – MANHÃ</div></th>
      </tr>
    `;
  }

  // Função para gerar o corpo do calendário
  function generateCalendarBody() {
    let calendarBody = '';
    let currentWeekCells = [];
    
    // Pré-processamento das atividades para combinar descrições separadas por enter
    const atividadesProcessadas = [];
    const atividadesPorData = new Map();

    // Primeiro, agrupa as atividades por data
    atividades.forEach(atividade => {
        const dataKey = format(new Date(atividade.data), 'yyyy-MM-dd');
        if (!atividadesPorData.has(dataKey)) {
            atividadesPorData.set(dataKey, []);
        }
        atividadesPorData.get(dataKey).push(atividade);
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

    console.log('[DEBUG] Atividades processadas:', atividadesProcessadas);

    // Filtra apenas dias úteis e organiza por data
    const atividadesPorDataUtil = new Map();
    atividadesProcessadas
        .filter(atividade => {
            const dataAtividade = new Date(atividade.data);
            const dayOfWeek = dataAtividade.getUTCDay();
            return dayOfWeek !== 0 && dayOfWeek !== 6;
        })
        .forEach(atividade => {
            const dataAtividade = new Date(atividade.data);
            const dataUTC = new Date(Date.UTC(
                dataAtividade.getUTCFullYear(),
                dataAtividade.getUTCMonth(),
                dataAtividade.getUTCDate()
            ));
            const key = format(dataUTC, 'dd/MM/yyyy', { locale: ptBR });
            if (!atividadesPorDataUtil.has(key)) {
                atividadesPorDataUtil.set(key, []);
            }
            atividadesPorDataUtil.get(key).push(atividade);
        });
    
    console.log('[DEBUG] Atividades organizadas:', Array.from(atividadesPorDataUtil.entries()));

    // Gerar células para cada dia do mês
    const startDate = new Date(Date.UTC(ano, mes - 1, 1));
    const endDate = new Date(Date.UTC(ano, mes, 0));
    let currentDate = startDate;

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getUTCDay();
        
        // Pular fins de semana
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = format(currentDate, 'dd/MM/yyyy', { locale: ptBR });
            const atividadesDoDia = atividadesPorDataUtil.get(dateStr) || [];

            const cell = `
                <td>
                    <div class="cell-content">
                        <div class="date-header">${dateStr}</div>
                        <div class="activity-content">
                            ${atividadesDoDia.map(atividade => {
                                // Formata a descrição para manter a estrutura visual
                                return atividade.descricao
                                    .split('\n')
                                    .map(line => line.trim())
                                    .join('<br>');
                            }).join('<br><br>')}
                        </div>
                    </div>
                </td>
            `;

            currentWeekCells.push(cell);

            // Se for sexta-feira ou último dia do mês, fecha a semana
            if (dayOfWeek === 5 || currentDate.getTime() === endDate.getTime()) {
                // Preencher células vazias até completar 5 dias
                while (currentWeekCells.length < 5) {
                    currentWeekCells.push('<td></td>');
                }
                calendarBody += `<tr>${currentWeekCells.join('')}</tr>`;
                currentWeekCells = [];
            }
        }

        currentDate = new Date(Date.UTC(
            currentDate.getUTCFullYear(),
            currentDate.getUTCMonth(),
            currentDate.getUTCDate() + 1
        ));
    }

    // Se sobrou alguma semana incompleta, adiciona
    if (currentWeekCells.length > 0) {
        while (currentWeekCells.length < 5) {
            currentWeekCells.push('<td></td>');
        }
        calendarBody += `<tr>${currentWeekCells.join('')}</tr>`;
    }

    return calendarBody;
  }

  // Função para obter o nome do dia da semana
  function getDiaSemana(dayNumber) {
    const diasSemana = {
      1: 'SEGUNDA – MANHÃ',
      2: 'TERÇA – MANHÃ',
      3: 'QUARTA – MANHÃ',
      4: 'QUINTA – MANHÃ',
      5: 'SEXTA – MANHÃ'
    };
    return diasSemana[dayNumber] || '';
  }

  // Gerar o HTML completo
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 1cm;
          width: 29.7cm;
          height: 21cm;
          box-sizing: border-box;
        }
        
        .container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5cm;
          flex: 0 0 auto;
        }
        
        .header img {
          height: 80px;
          width: auto;
          object-fit: contain;
        }
        
        .header img.center-logo {
          height: 96px;
        }
        
        .ubsf-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0.5cm 0;
          padding: 0.3cm;
          background-color: #f8f9fa;
          border-radius: 5px;
          flex: 0 0 auto;
        }
        
        .ubsf-info p {
          margin: 0;
          padding: 0 0.5cm;
          flex: 1;
          text-align: center;
          font-size: 0.9em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .cronograma-title {
          text-align: center;
          font-weight: bold;
          margin: 0.5cm 0;
          text-transform: uppercase;
          flex: 0 0 auto;
          font-size: 1.1em;
        }
        
        .table-container {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          flex: 1;
          table-layout: fixed;
        }
        
        th, td {
          border: 1px solid black;
          padding: 0;
          text-align: center;
          width: 20%;
          position: relative;
          vertical-align: top;
        }
        
        td:empty {
          background-color: #f8f9fa;
        }
        
        th {
          padding: 0.2cm;
          vertical-align: middle;
          background-color: yellow;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 0.9em;
          white-space: nowrap;
        }
        
        .cell-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 2.5cm;
        }

        .date-header {
          background-color: yellow;
          padding: 0.2cm;
          font-weight: bold;
          font-size: 0.9em;
          border-bottom: 1px solid black;
          white-space: nowrap;
        }
        
        .activity-content {
          flex: 1;
          padding: 0.3cm;
          font-size: 0.85em;
          line-height: 1.4;
          white-space: pre-line;
        }

        tr {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="data:image/png;base64,${leftLogoBase64}" alt="Logo Saúde da Família" />
          <img src="data:image/png;base64,${centerLogoBase64}" alt="Título" class="center-logo" />
          <img src="data:image/jpeg;base64,${rightLogoBase64}" alt="Logo Tutoia" />
        </div>
        
        <div class="ubsf-info">
          <p><strong>UBSF:</strong> ${nomeUBSF || '-'}</p>
          <p><strong>Enfermeiro(a):</strong> ${enfermeiro || '-'}</p>
          <p><strong>Médico(a):</strong> ${medico || '-'}</p>
        </div>

        <div class="cronograma-title">
          CRONOGRAMA DE ATENDIMENTO ${getMesNome(mes).toUpperCase()}/${ano}
        </div>

        <div class="table-container">
          <table>
            ${generateTableHeader()}
            ${generateCalendarBody()}
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Função auxiliar para converter número do mês em nome
function getMesNome(mes) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[mes - 1] || 'Mês Inválido';
}

module.exports = {
  generateCalendarHtml
}; 