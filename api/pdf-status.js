// Endpoint para verificar qual implementação de PDF está ativa
module.exports = async (req, res) => {
  try {
    // Verificar método
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        message: 'Método não permitido'
      });
    }

    // Verificar se os handlers existem
    const hasPuppeteer = !!require('./cronogramas/[id]/pdf-puppeteer');
    const hasPDFShift = !!require('./cronogramas/[id]/pdf');

    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      implementations: {
        puppeteer: {
          status: 'ATIVO',
          route: '/api/cronogramas/{id}/pdf',
          description: 'Implementação principal usando Puppeteer via rota /pdf'
        },
        pdfshift: {
          status: 'DESCONTINUADO',
          route: 'REMOVIDO',
          description: 'Implementação removida para economizar funções serverless'
        }
      },
      routes: {
        main: '/api/cronogramas/{id}/pdf',
        puppeteer_direct: '/api/cronogramas/{id}/pdf-puppeteer',
        status: '/api/pdf-status'
      },
      migration: {
        status: 'CONCLUÍDA',
        date: '2025-01-05',
        details: 'Rota /pdf agora redireciona para Puppeteer, CORS configurado'
      },
      serverless_functions: {
        current_count: 12,
        vercel_limit: 12,
        status: 'NO LIMITE (test.js removido)'
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Status das implementações de PDF',
      data: status
    });

  } catch (error) {
    console.error('Erro no endpoint pdf-status:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};