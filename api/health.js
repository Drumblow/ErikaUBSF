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

    let databaseStatus = 'Unknown';
    let databaseError = null;

    // Testar conexão com o banco de dados (com timeout)
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      );
      
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        timeoutPromise
      ]);
      
      databaseStatus = 'Connected';
    } catch (dbError) {
      console.warn('Database connection failed:', dbError.message);
      databaseStatus = 'Disconnected';
      databaseError = dbError.message;
    }

    const healthData = {
      status: databaseStatus === 'Connected' ? 'OK' : 'PARTIAL',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: databaseStatus,
      environment: process.env.NODE_ENV || 'development'
    };

    if (databaseError) {
      healthData.databaseError = databaseError;
    }

    // Retorna 200 mesmo se o banco estiver desconectado (para não falhar o deploy)
    return successResponse(res, healthData, 'API está funcionando');

  } catch (error) {
    console.error('Erro no health check:', error);
    
    const healthData = {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'Unknown',
      environment: process.env.NODE_ENV || 'development',
      error: error.message
    };

    return errorResponse(res, 'Erro no health check da API', 500, healthData);
  }
}

module.exports = handler;