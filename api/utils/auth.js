const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('../../lib/database');

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-segura';

// Gera um hash da senha
const hashSenha = async (senha) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(senha, salt);
};

// Verifica se a senha está correta
const verificarSenha = async (senha, hash) => {
  return bcrypt.compare(senha, hash);
};

// Gera um token JWT
const gerarToken = (usuario) => {
  return jwt.sign(
    { 
      id: usuario.id,
      email: usuario.email,
      cargo: usuario.cargo
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Middleware para verificar autenticação
const verificarAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuário no banco
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id }
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Remover a senha do objeto do usuário
    const { senha: _, ...usuarioSemSenha } = usuario;
    
    // Adicionar usuário ao request
    req.usuario = usuarioSemSenha;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  hashSenha,
  verificarSenha,
  gerarToken,
  verificarAuth
}; 