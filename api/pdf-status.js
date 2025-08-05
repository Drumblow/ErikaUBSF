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

    return res.status(200).json({
      success: true,
      message: 'Status das implementações de PDF',
      data: {
        timestamp: new Date().toISOString(),
        implementations: {
          puppeteer: {
            available: hasPuppeteer,
            route: '/api/cronogramas/{id}/pdf',
            status: 'ATIVO (único)'
          },
          pdfshift: {
            available: false,
            route: 'REMOVIDO',
            status: 'DESCONTINUADO'
          }
        },
        migration: {
          completed: true,
          date: '2025-01-15',
          version: '2.0.0'
        },
        environment: {
          node_version: process.version,
          platform: process.platform,
          vercel: !!process.env.VERCEL,
          deployment_url: process.env.VERCEL_URL || 'localhost'
        }
      }
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