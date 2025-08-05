const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar handlers das APIs
const healthHandler = require('./api/health');
const cronogramasHandler = require('./api/cronogramas/index');
const cronogramaByIdHandler = require('./api/cronogramas/[id]');
const atividadesHandler = require('./api/cronogramas/[id]/atividades');
const pdfHandler = require('./api/cronogramas/[id]/pdf');
const pdfPuppeteerHandler = require('./api/cronogramas/[id]/pdf-puppeteer');
const pdfStatusHandler = require('./api/pdf-status');
const atividadeByIdHandler = require('./api/atividades/[id]');
const { cadastrarUsuario, login, atualizarUsuario, excluirUsuario } = require('./api/auth/usuarios');
const { verificarAuth } = require('./api/utils/auth');

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

// Função helper para simular req.query e req.params do Vercel
const createVercelRequest = (req, params = {}) => {
  // Não crie um novo objeto, modifique o existente para preservar o protótipo
  req.query = {
    ...req.query,
    ...params
  };
  req.params = {
    ...req.params,
    ...params
  };
  return req;
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

// Status das implementações de PDF
app.get('/api/pdf-status', async (req, res) => {
  try {
    await pdfStatusHandler(req, res);
  } catch (error) {
    console.error('Erro no pdf-status:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Cronogramas (agora a autenticação é tratada dentro do handler)
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

// Atividades do Cronograma
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
      // O handler de atividades pode retornar erros de validação específicos
      if (error.message.includes('Dados inválidos')) {
        return errorResponse(res, error.message, 400);
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  });

// Rota para gerar PDF (agora usando Puppeteer)
app.post('/api/cronogramas/:id/pdf', async (req, res) => {
  try {
    const vercelReq = createVercelRequest(req, { id: req.params.id });
    await pdfPuppeteerHandler(vercelReq, res);
  } catch (error) {
    console.error('Erro ao gerar PDF com Puppeteer:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Rota para gerar PDF com PDFShift (legado - mantida para fallback)
app.post('/api/cronogramas/:id/pdf-pdfshift', async (req, res) => {
  try {
    const vercelReq = createVercelRequest(req, { id: req.params.id });
    await pdfHandler(vercelReq, res);
  } catch (error) {
    console.error('Erro ao gerar PDF com PDFShift:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Atividade por ID
app.route('/api/atividades/:id')
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

// Rotas de Autenticação
app.post('/api/auth/cadastro', cadastrarUsuario);
app.post('/api/auth/login', login);
app.put('/api/auth/usuarios/:id', async (req, res) => {
  try {
    const vercelReq = createVercelRequest(req, { id: req.params.id });
    await atualizarUsuario(vercelReq, res);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});
app.delete('/api/auth/usuarios/:id', async (req, res) => {
  try {
    const vercelReq = createVercelRequest(req, { id: req.params.id });
    await excluirUsuario(vercelReq, res);
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
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

// Iniciar servidor apenas se não estiver sendo importado para testes
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Documentação: http://localhost:${PORT}`);
    console.log(`🗄️  Prisma Studio: npx prisma studio`);
  });
}

module.exports = app;