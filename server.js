const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar handlers das APIs
const healthHandler = require('./api/health');
const cronogramasHandler = require('./api/cronogramas/index');
const cronogramaByIdHandler = require('./api/cronogramas/[id]');
const atividadesHandler = require('./api/cronogramas/[id]/atividades');
const pdfHandler = require('./api/cronogramas/[id]/pdf');
const atividadeByIdHandler = require('./api/atividades/[id]');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do diretório do template de PDF
app.use(express.static(path.join(__dirname, 'CRONOGRAMA MES JUNHO')));

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Função helper para simular req.query do Vercel
const createVercelRequest = (req, params = {}) => {
  return {
    ...req,
    query: {
      ...req.query,
      ...params
    }
  };
};

// Rotas da API

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await healthHandler(req, res);
  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Cronogramas
app.route('/api/cronogramas')
  .get(async (req, res) => {
    try {
      await cronogramasHandler(req, res);
    } catch (error) {
      console.error('Erro ao listar cronogramas:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  })
  .post(async (req, res) => {
    try {
      await cronogramasHandler(req, res);
    } catch (error) {
      console.error('Erro ao criar cronograma:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

// Cronograma por ID
app.route('/api/cronogramas/:id')
  .get(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await cronogramaByIdHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao buscar cronograma:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  })
  .put(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await cronogramaByIdHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao atualizar cronograma:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  })
  .delete(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await cronogramaByIdHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao deletar cronograma:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

// Atividades de um cronograma
app.route('/api/cronogramas/:id/atividades')
  .get(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await atividadesHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao listar atividades:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  })
  .post(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await atividadesHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

// Rota para gerar PDF
app.post('/api/cronogramas/:id/pdf', async (req, res) => {
  try {
    const vercelReq = createVercelRequest(req, { id: req.params.id });
    await pdfHandler(vercelReq, res);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Atividade por ID
app.route('/api/atividades/:id')
  .get(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await atividadeByIdHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao buscar atividade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  })
  .put(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await atividadeByIdHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  })
  .delete(async (req, res) => {
    try {
      const vercelReq = createVercelRequest(req, { id: req.params.id });
      await atividadeByIdHandler(vercelReq, res);
    } catch (error) {
      console.error('Erro ao deletar atividade:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

// Rota de fallback
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cronograma UBSF API está funcionando!',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      cronogramas: '/api/cronogramas',
      cronograma: '/api/cronogramas/:id',
      atividades: '/api/cronogramas/:id/atividades',
      atividade: '/api/atividades/:id'
    }
  });
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Documentação: http://localhost:${PORT}`);
  console.log(`🗄️  Prisma Studio: npx prisma studio`);
});