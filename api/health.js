const { prisma } = require('../lib/database');
const { successResponse, errorResponse, corsHeaders } = require('../lib/utils');

async function handler(req, res) {
  // Configurar CORS
  if (corsHeaders(req, res)) return;

  try {
    // Verificar se é um GET request
    if (req.method !== 'GET') {
      return errorResponse(res, 'Método não permitido', 405);
    }

    // Testar conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1`;

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'Connected',
      environment: process.env.NODE_ENV || 'development'
    };

    return successResponse(res, healthData, 'API está funcionando corretamente');

  } catch (error) {
    console.error('Erro no health check:', error);
    
    const healthData = {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'Disconnected',
      environment: process.env.NODE_ENV || 'development',
      error: error.message
    };

    return errorResponse(res, 'Erro no health check da API', 500, healthData);
  }
}

module.exports = handler;