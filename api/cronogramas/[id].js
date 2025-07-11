const { PrismaClient } = require('@prisma/client');
const { 
  successResponse, 
  errorResponse, 
  corsHeaders, 
  schemas, 
  validateData, 
  handlePrismaError,
  isValidId 
} = require('../../lib/utils');
const { verificarAuthAsPromise } = require('../utils/auth');

const prisma = new PrismaClient();

module.exports = async (req, res) => {
  // Configurar CORS
  if (corsHeaders(req, res)) return;

  try {
    await verificarAuthAsPromise(req);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 401);
  }

  try {
    const { id } = req.query;

    // Validar ID
    if (!isValidId(id)) {
      return errorResponse(res, 'ID inválido', 400);
    }

    switch (req.method) {
      case 'GET':
        return await getCronograma(req, res, id);
      case 'PUT':
        return await updateCronograma(req, res, id);
      case 'DELETE':
        return await deleteCronograma(req, res, id);
      default:
        return errorResponse(res, 'Método não permitido', 405);
    }
  } catch (error) {
    console.error('Erro na API de cronograma por ID:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// GET /api/cronogramas/[id] - Buscar cronograma por ID
async function getCronograma(req, res, id) {
  try {
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
    if (cronograma.usuarioId !== req.usuario.id) {
      return errorResponse(res, 'Sem permissão para acessar este cronograma', 403);
    }
    
    return successResponse(res, cronograma, 'Cronograma encontrado com sucesso');
    
  } catch (error) {
    console.error('Erro ao buscar cronograma:', error);
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}

// PUT /api/cronogramas/[id] - Atualizar cronograma
async function updateCronograma(req, res, id) {
  try {
    // Verificar se cronograma existe
    const existingCronograma = await prisma.cronograma.findUnique({
      where: { id }
    });
    
    if (!existingCronograma) {
      return errorResponse(res, 'Cronograma não encontrado', 404);
    }

    // Verificar se o usuário tem permissão para atualizar este cronograma
    if (existingCronograma.usuarioId !== req.usuario.id) {
      return errorResponse(res, 'Sem permissão para atualizar este cronograma', 403);
    }
    
    // Validar dados de entrada
    const validatedData = validateData(req.body, schemas.updateCronograma);
    
    // Se estiver atualizando mês/ano, verificar se não há conflito
    if (validatedData.mes || validatedData.ano) {
      const mes = validatedData.mes || existingCronograma.mes;
      const ano = validatedData.ano || existingCronograma.ano;
      
      const conflictCronograma = await prisma.cronograma.findFirst({
        where: {
          mes,
          ano,
          usuarioId: req.usuario.id,
          id: { not: id }
        }
      });
      
      if (conflictCronograma) {
        return errorResponse(
          res, 
          `Já existe outro cronograma para ${mes}/${ano}`, 
          400
        );
      }
    }
    
    // Atualizar cronograma
    const cronograma = await prisma.cronograma.update({
      where: { id },
      data: validatedData,
      include: {
        atividades: {
          orderBy: {
            data: 'asc'
          }
        }
      }
    });
    
    return successResponse(res, cronograma, 'Cronograma atualizado com sucesso');
    
  } catch (error) {
    console.error('Erro ao atualizar cronograma:', error);
    
    if (error.message.includes('Dados inválidos')) {
      return errorResponse(res, error.message, 400);
    }
    
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}

// DELETE /api/cronogramas/[id] - Deletar cronograma
async function deleteCronograma(req, res, id) {
  try {
    // Verificar se cronograma existe
    const existingCronograma = await prisma.cronograma.findUnique({
      where: { id },
      include: {
        atividades: true
      }
    });
    
    if (!existingCronograma) {
      return errorResponse(res, 'Cronograma não encontrado', 404);
    }

    // Verificar se o usuário tem permissão para deletar este cronograma
    if (existingCronograma.usuarioId !== req.usuario.id) {
      return errorResponse(res, 'Sem permissão para deletar este cronograma', 403);
    }
    
    // Deletar cronograma (atividades serão deletadas em cascata)
    await prisma.cronograma.delete({
      where: { id }
    });
    
    return successResponse(
      res, 
      { 
        id, 
        deletedActivities: existingCronograma.atividades.length 
      }, 
      'Cronograma deletado com sucesso'
    );
    
  } catch (error) {
    console.error('Erro ao deletar cronograma:', error);
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}