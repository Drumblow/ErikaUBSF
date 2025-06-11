const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  const prisma = new PrismaClient(); // Local instance
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, password, nome } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário com este email já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome,
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Não foi possível registrar o usuário.' });
  } finally {
    // Em um ambiente serverless, é comum não desconectar a cada requisição
    // await prisma.$disconnect();
  }
} 