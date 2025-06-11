const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

beforeAll(async () => {
  // Limpar dados de teste anteriores
  await prisma.atividade.deleteMany({
    where: {
      cronograma: {
        usuario: {
          email: {
            contains: 'test@'
          }
        }
      }
    }
  });
  
  await prisma.cronograma.deleteMany({
    where: {
      usuario: {
        email: {
          contains: 'test@'
        }
      }
    }
  });
  
  await prisma.usuario.deleteMany({
    where: {
      email: {
        contains: 'test@'
      }
    }
  });
});

afterAll(async () => {
  // Limpar dados de teste
  await prisma.atividade.deleteMany({
    where: {
      cronograma: {
        usuario: {
          email: {
            contains: 'test@'
          }
        }
      }
    }
  });
  
  await prisma.cronograma.deleteMany({
    where: {
      usuario: {
        email: {
          contains: 'test@'
        }
      }
    }
  });
  
  await prisma.usuario.deleteMany({
    where: {
      email: {
        contains: 'test@'
      }
    }
  });
  
  await prisma.$disconnect();
}); 