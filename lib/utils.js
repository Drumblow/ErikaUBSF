const Joi = require('joi');

// Função para resposta padronizada da API
const apiResponse = (res, success, data = null, message = '', statusCode = 200) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Função para resposta de sucesso
const successResponse = (res, data, message = 'Operação realizada com sucesso', statusCode = 200) => {
  return apiResponse(res, true, data, message, statusCode);
};

// Função para resposta de erro
const errorResponse = (res, message = 'Erro interno do servidor', statusCode = 500, data = null) => {
  return apiResponse(res, false, data, message, statusCode);
};

// Middleware para tratamento de CORS
const corsHeaders = (req, res) => {
  const allowedOrigins = [
    'https://erika-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
};

// Schemas de validação Joi
const schemas = {
  cronograma: Joi.object({
    mes: Joi.number().integer().min(1).max(12).required(),
    ano: Joi.number().integer().min(2020).max(2030).required(),
    nomeUBSF: Joi.string().max(255).optional().allow(''),
    enfermeiro: Joi.string().max(255).optional().allow(''),
    medico: Joi.string().max(255).optional().allow('')
  }),
  
  atividade: Joi.object({
    cronogramaId: Joi.string().required(),
    data: Joi.date().required(),
    diaSemana: Joi.string().valid(
      'SEGUNDA-MANHÃ', 'SEGUNDA-TARDE',
      'TERÇA-MANHÃ', 'TERÇA-TARDE',
      'QUARTA-MANHÃ', 'QUARTA-TARDE',
      'QUINTA-MANHÃ', 'QUINTA-TARDE',
      'SEXTA-MANHÃ', 'SEXTA-TARDE',
      'SÁBADO-MANHÃ', 'SÁBADO-TARDE'
    ).required(),
    descricao: Joi.string().max(500).required()
  }),
  
  updateCronograma: Joi.object({
    mes: Joi.number().integer().min(1).max(12).optional(),
    ano: Joi.number().integer().min(2020).max(2030).optional(),
    nomeUBSF: Joi.string().max(255).optional().allow(''),
    enfermeiro: Joi.string().max(255).optional().allow(''),
    medico: Joi.string().max(255).optional().allow('')
  }),
  
  updateAtividade: Joi.object({
    data: Joi.date().optional(),
    diaSemana: Joi.string().valid(
      'SEGUNDA-MANHÃ', 'SEGUNDA-TARDE',
      'TERÇA-MANHÃ', 'TERÇA-TARDE',
      'QUARTA-MANHÃ', 'QUARTA-TARDE',
      'QUINTA-MANHÃ', 'QUINTA-TARDE',
      'SEXTA-MANHÃ', 'SEXTA-TARDE',
      'SÁBADO-MANHÃ', 'SÁBADO-TARDE'
    ).optional(),
    descricao: Joi.string().max(500).optional()
  })
};

// Função para validar dados
const validateData = (data, schema) => {
  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(`Dados inválidos: ${error.details[0].message}`);
  }
  return value;
};

// Função para tratar erros do Prisma
const handlePrismaError = (error) => {
  console.error('Erro do Prisma:', error);
  
  if (error.code === 'P2002') {
    return 'Já existe um registro com esses dados únicos';
  }
  
  if (error.code === 'P2025') {
    return 'Registro não encontrado';
  }
  
  if (error.code === 'P2003') {
    return 'Violação de chave estrangeira';
  }
  
  return 'Erro interno do banco de dados';
};

// Função para formatar datas
const formatDate = (date) => {
  return new Date(date).toISOString();
};

// Função para validar ID
const isValidId = (id) => {
  return typeof id === 'string' && id.length > 0;
};

module.exports = {
  apiResponse,
  successResponse,
  errorResponse,
  corsHeaders,
  schemas,
  validateData,
  handlePrismaError,
  formatDate,
  isValidId
};