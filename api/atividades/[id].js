const { prisma } = require('../../lib/database');
const { 
  successResponse, 
  errorResponse, 
  corsHeaders, 
  schemas, 
  validateData, 
  handlePrismaError,
  isValidId 
} = require('../../lib/utils');

module.exports = async (req, res) => {
  // Configurar CORS
  if (corsHeaders(req, res)) return;

  try {
    const { id } = req.query;
    
    // Validar ID
    if (!isValidId(id)) {
      return errorResponse(res, 'ID da atividade inválido', 400);
    }

    switch (req.method) {
      case 'GET':
        return await getAtividade(req, res, id);
      case 'PUT':
        return await updateAtividade(req, res, id);
      case 'DELETE':
        return await deleteAtividade(req, res, id);
      default:
        return errorResponse(res, 'Método não permitido', 405);
    }
  } catch (error) {
    console.error('Erro na API de atividade por ID:', error);
    return errorResponse(res, 'Erro interno do servidor', 500);
  }
};

// GET /api/atividades/[id] - Buscar atividade por ID
async function getAtividade(req, res, id) {
  try {
    const atividade = await prisma.atividade.findUnique({
      where: { id },
      include: {
        cronograma: {
          select: {
            id: true,
            mes: true,
            ano: true,
            nomeUBSF: true,
            enfermeiro: true,
            medico: true
          }
        }
      }
    });
    
    if (!atividade) {
      return errorResponse(res, 'Atividade não encontrada', 404);
    }
    
    return successResponse(res, atividade, 'Atividade encontrada com sucesso');
    
  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}

// PUT /api/atividades/[id] - Atualizar atividade
async function updateAtividade(req, res, id) {
  try {
    // Verificar se atividade existe
    const existingAtividade = await prisma.atividade.findUnique({
      where: { id }
    });
    
    if (!existingAtividade) {
      return errorResponse(res, 'Atividade não encontrada', 404);
    }
    
    // Validar dados de entrada
    const validatedData = validateData(req.body, schemas.updateAtividade);
    
    // Se estiver atualizando data ou diaSemana, verificar conflitos
    if (validatedData.data || validatedData.diaSemana) {
      const data = validatedData.data ? new Date(validatedData.data) : existingAtividade.data;
      const diaSemana = validatedData.diaSemana || existingAtividade.diaSemana;
      
      const conflictAtividade = await prisma.atividade.findFirst({
        where: {
          cronogramaId: existingAtividade.cronogramaId,
          data,
          diaSemana,
          id: { not: id }
        }
      });
      
      if (conflictAtividade) {
        return errorResponse(
          res, 
          `Já existe outra atividade para ${diaSemana} em ${data.toLocaleDateString('pt-BR')}`, 
          400
        );
      }
    }
    
    // Preparar dados para atualização
    const updateData = { ...validatedData };
    if (updateData.data) {
      updateData.data = new Date(updateData.data);
    }
    
    // Atualizar atividade
    const atividade = await prisma.atividade.update({
      where: { id },
      data: updateData,
      include: {
        cronograma: {
          select: {
            id: true,
            mes: true,
            ano: true,
            nomeUBSF: true,
            enfermeiro: true,
            medico: true
          }
        }
      }
    });
    
    return successResponse(res, atividade, 'Atividade atualizada com sucesso');
    
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    
    if (error.message.includes('Dados inválidos')) {
      return errorResponse(res, error.message, 400);
    }
    
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}

// DELETE /api/atividades/[id] - Deletar atividade
async function deleteAtividade(req, res, id) {
  try {
    // Verificar se atividade existe
    const existingAtividade = await prisma.atividade.findUnique({
      where: { id },
      include: {
        cronograma: {
          select: {
            id: true,
            mes: true,
            ano: true,
            nomeUBSF: true
          }
        }
      }
    });
    
    if (!existingAtividade) {
      return errorResponse(res, 'Atividade não encontrada', 404);
    }
    
    // Deletar atividade
    await prisma.atividade.delete({
      where: { id }
    });
    
    return successResponse(
      res, 
      { 
        id,
        cronograma: existingAtividade.cronograma,
        data: existingAtividade.data,
        diaSemana: existingAtividade.diaSemana
      }, 
      'Atividade deletada com sucesso'
    );
    
  } catch (error) {
    console.error('Erro ao deletar atividade:', error);
    const message = handlePrismaError(error);
    return errorResponse(res, message, 500);
  }
}