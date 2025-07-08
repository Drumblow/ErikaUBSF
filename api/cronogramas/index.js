const { PrismaClient } = require('@prisma/client');
const { 
  successResponse, 
  errorResponse, 
  corsHeaders, 
  schemas, 
  validateData, 
  handlePrismaError 
} = require('../../lib/utils');
const { verificarAuthAsPromise } = require('../utils/auth');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Configurar CORS
  if (corsHeaders(req, res)) return;

  try {
    // Adiciona a verificação de autenticação diretamente no handler
    await verificarAuthAsPromise(req);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 401);
  }

  // A autenticação foi bem-sucedida, req.usuario está definido
  try {
    switch (req.method) {
      case 'GET':
        return await getCronogramas(req, res);
      case 'POST':
        return await createCronograma(req, res);
      default:
        return errorResponse(res, 'Método não permitido', 405);
    }
  } catch (error) {
    console.error('Erro na API de cronogramas:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// GET /api/cronogramas - Listar cronogramas do usuário autenticado
async function getCronogramas(req, res) {
  try {
    const { page = 1, limit = 10, mes, ano } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Construir filtros - IMPORTANTE: filtrar por usuário logado
    const where = {
      usuarioId: req.usuario.id // Filtrar apenas cronogramas do usuário autenticado
    };

    console.log(`[Diagnóstico de Cronogramas] Buscando cronogramas para o usuário ID: ${req.usuario.id} (${req.usuario.email}) com os filtros: mes=${mes || 'nenhum'}, ano=${ano || 'nenhum'}`);
    
    if (mes) where.mes = parseInt(mes);
    if (ano) where.ano = parseInt(ano);

    console.log('[Diagnóstico de Cronogramas] Objeto `where` final enviado ao Prisma:', JSON.stringify(where));
    
    // Buscar cronogramas com paginação
    const [cronogramas, total] = await Promise.all([
      prisma.cronograma.findMany({
        where,
        skip,
        take,
        include: {
          atividades: {
            orderBy: {
              data: 'asc'
            }
          }
        },
        orderBy: {
          criadoEm: 'desc'
        }
      }),
      prisma.cronograma.count({ where })
    ]);
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    };
    
    return successResponse(res, {
      cronogramas,
      pagination
    }, 'Cronogramas listados com sucesso');
    
  } catch (error) {
    console.error('Erro ao buscar cronogramas:', error);
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}

// POST /api/cronogramas - Criar novo cronograma para o usuário autenticado
async function createCronograma(req, res) {
  try {
    // Validar dados de entrada
    const validatedData = validateData(req.body, schemas.cronograma);
    
    // Verificar se já existe cronograma para o mesmo mês/ano do usuário
    const existingCronograma = await prisma.cronograma.findFirst({
      where: {
        mes: validatedData.mes,
        ano: validatedData.ano,
        usuarioId: req.usuario.id
      }
    });
    
    if (existingCronograma) {
      return errorResponse(
        res, 
        `Você já possui um cronograma para ${validatedData.mes}/${validatedData.ano}`, 
        400
      );
    }
    
    // Adicionar usuarioId aos dados
    validatedData.usuarioId = req.usuario.id;
    
    // Criar cronograma
    const cronograma = await prisma.cronograma.create({
      data: validatedData,
      include: {
        atividades: true
      }
    });
    
    return successResponse(
      res, 
      cronograma, 
      'Cronograma criado com sucesso', 
      201
    );
    
  } catch (error) {
    console.error('Erro ao criar cronograma:', error);
    
    if (error.message.includes('Dados inválidos')) {
      return errorResponse(res, error.message, 400);
    }
    
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}