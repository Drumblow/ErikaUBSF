const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const hashSenha = async (senha) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(senha, salt);
};

const resetarSenha = async (email, novaSenha) => {
  if (!email || !novaSenha) {
    console.error('Email e nova senha são obrigatórios.');
    return;
  }

  try {
    console.log(`Procurando usuário com o email: ${email}...`);
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      console.error(`Usuário com email "${email}" não encontrado.`);
      return;
    }

    console.log(`Usuário encontrado: ${usuario.nome}. Gerando novo hash...`);
    const novoHash = await hashSenha(novaSenha);

    await prisma.usuario.update({
      where: { email },
      data: { senha: novoHash }
    });

    console.log(`✅ Senha do usuário ${email} foi redefinida com sucesso!`);
    console.log('O usuário agora pode fazer login com a nova senha.');

  } catch (error) {
    console.error('Ocorreu um erro ao redefinir a senha:', error);
  } finally {
    await prisma.$disconnect();
  }
};

rl.question('Digite o email do usuário para redefinir a senha: ', (email) => {
  rl.question('Digite a nova senha: ', (novaSenha) => {
    resetarSenha(email.trim(), novaSenha.trim());
    rl.close();
  });
}); 