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
const verificarAuth = (req, res, next) => {
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
    req.usuario = decoded;
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

const verifyUser = async (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) {
    res.status(401).json({ error: 'Token de autorização não fornecido.' });
    return null;
  }

  const token = authorization.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token mal formatado.' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return null;
    }
    req.user = user;
    return user;
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
    return null;
  }
};

module.exports = {
  hashSenha,
  verificarSenha,
  gerarToken,
  verificarAuth,
  verifyUser
}; 