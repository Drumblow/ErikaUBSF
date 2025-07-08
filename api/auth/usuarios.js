const { prisma } = require('../../lib/database');
const { hashSenha, verificarSenha, gerarToken } = require('../utils/auth');
const { errorResponse } = require('../../lib/utils');

// Cadastrar novo usuário
const cadastrarUsuario = async (req, res) => {
  try {
    const { email, nome, senha, cargo } = req.body;

    // Validar dados
    if (!email || !nome || !senha || !cargo) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Verificar se usuário já existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(409).json({
        success: false,
        message: 'Email já existe',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Criar usuário
    const senhaHash = await hashSenha(senha);
    const usuario = await prisma.usuario.create({
      data: {
        email,
        nome,
        senha: senhaHash,
        cargo
      }
    });

    // Gerar token
    const token = gerarToken(usuario);

    // Retornar resposta sem a senha
    const { senha: _, ...usuarioSemSenha } = usuario;
    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso',
      data: {
        usuario: usuarioSemSenha,
        token
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validar dados
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Verificar senha
    const senhaValida = await verificarSenha(senha, usuario.senha);

    if (!senhaValida) {
      // Adiciona log para diagnóstico de hashes antigos
      console.log(`[Diagnóstico de Login] Tentativa de login falhou para o usuário: ${email}. Hash no banco: ${usuario.senha}`);
      return errorResponse(res, 'Credenciais inválidas', 401);
    }

    // Gerar token JWT
    const token = gerarToken(usuario);

    // Retornar resposta sem a senha
    const { senha: _, ...usuarioSemSenha } = usuario;
    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        usuario: usuarioSemSenha,
        token
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

// Atualizar usuário
const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, senha, cargo } = req.body;

    // Verificar se usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Verificar permissão
    if (req.usuario.id !== usuario.id && req.usuario.cargo !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para atualizar este usuário',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Preparar dados para atualização
    const dadosAtualizacao = {};
    if (nome) dadosAtualizacao.nome = nome;
    if (senha) dadosAtualizacao.senha = await hashSenha(senha);
    if (cargo && req.usuario.cargo === 'admin') dadosAtualizacao.cargo = cargo;

    // Atualizar usuário
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dadosAtualizacao
    });

    // Retornar resposta sem a senha
    const { senha: _, ...usuarioSemSenha } = usuarioAtualizado;
    return res.status(200).json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: usuarioSemSenha,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

// Excluir usuário
const excluirUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Verificar permissão
    if (req.usuario.id !== id && req.usuario.cargo !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para excluir este usuário',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    // Excluir usuário
    await prisma.usuario.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Usuário excluído com sucesso',
      data: null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  cadastrarUsuario,
  login,
  atualizarUsuario,
  excluirUsuario
}; 