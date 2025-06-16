const { prisma } = require('../../../lib/database');
const { 
  successResponse, 
  errorResponse, 
  corsHeaders, 
  schemas, 
  validateData, 
  handlePrismaError,
  isValidId 
} = require('../../../lib/utils');
const { verificarAuth } = require('../../utils/auth');

module.exports = async (req, res) => {
  // Configurar CORS
  if (corsHeaders(req, res)) return;

  // Verificar autenticação primeiro
  verificarAuth(req, res, async () => {
    try {
      const { id } = req.query; // ID do cronograma
      
      // Validar ID do cronograma
      if (!isValidId(id)) {
        return errorResponse(res, 'ID do cronograma inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getAtividades(req, res, id);
        case 'POST':
          return await createAtividade(req, res, id);
        default:
          return errorResponse(res, 'Método não permitido', 405);
      }
    } catch (error) {
      console.error('Erro na API de atividades:', error);
      return errorResponse(res, 'Erro interno do servidor', 500);
    }
  });
};

// GET /api/cronogramas/[id]/atividades - Listar atividades do cronograma
async function getAtividades(req, res, cronogramaId) {
  try {
    // Verificar se cronograma existe e pertence ao usuário
    const cronograma = await prisma.cronograma.findFirst({
      where: { 
        id: cronogramaId,
        usuarioId: req.usuario.id
      }
    });
    
    if (!cronograma) {
      return errorResponse(res, 'Cronograma não encontrado', 404);
    }
    
    const { page = 1, limit = 50, diaSemana, dataInicio, dataFim } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Construir filtros
    const where = { cronogramaId };
    
    if (diaSemana) {
      where.diaSemana = diaSemana;
    }
    
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = new Date(dataInicio);
      if (dataFim) where.data.lte = new Date(dataFim);
    }
    
    // Buscar atividades com paginação
    const [atividades, total] = await Promise.all([
      prisma.atividade.findMany({
        where,
        skip,
        take,
        orderBy: [
          { data: 'asc' },
          { diaSemana: 'asc' }
        ]
      }),
      prisma.atividade.count({ where })
    ]);
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    };
    
    return successResponse(res, {
      cronograma: {
        id: cronograma.id,
        mes: cronograma.mes,
        ano: cronograma.ano,
        nomeUBSF: cronograma.nomeUBSF
      },
      atividades,
      pagination
    }, 'Atividades listadas com sucesso');
    
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}

// POST /api/cronogramas/[id]/atividades - Criar nova atividade
async function createAtividade(req, res, cronogramaId) {
  try {
    // Verificar se cronograma existe e pertence ao usuário
    const cronograma = await prisma.cronograma.findFirst({
      where: { 
        id: cronogramaId,
        usuarioId: req.usuario.id
      }
    });

    if (!cronograma) {
      return errorResponse(res, 'Cronograma não encontrado', 404);
    }

    // Validar dados de entrada
    const validatedData = validateData(req.body, schemas.atividade);

    // Garantir que o cronogramaId seja o correto
    validatedData.cronogramaId = cronogramaId;

    // Criar atividade
    const atividade = await prisma.atividade.create({
      data: {
        ...validatedData,
        data: new Date(validatedData.data),
      },
    });

    return successResponse(
      res,
      atividade,
      'Atividade criada com sucesso',
      201
    );
  } catch (error) {
    console.error('Erro ao criar atividade:', error);

    if (error.message.includes('Dados inválidos')) {
      return errorResponse(res, error.message, 400);
    }

    // Tratar erro de constraint única do Prisma (P2002)
    if (error.code === 'P2002') {
      return errorResponse(
        res,
        'Já existe uma atividade com a mesma descrição, data e período.',
        409 // Conflito
      );
    }

    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}