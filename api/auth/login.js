const { corsHeaders } = require('../../lib/utils');
const { login } = require('./usuarios');

module.exports = async (req, res) => {
  // Configurar CORS
  if (corsHeaders(req, res)) {
    return; // Se for OPTIONS, apenas retorna
  }

  // Aceitar apenas POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Método não permitido',
      data: null,
      timestamp: new Date().toISOString()
    });
  }

  try {
    await login(req, res);
  } catch (error) {
    console.error('Erro no endpoint de login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
}; 