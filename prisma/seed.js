const { PrismaClient } = require('@prisma/client');
const { hashSenha } = require('../api/utils/auth');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Limpar dados existentes
    await prisma.atividade.deleteMany();
    await prisma.cronograma.deleteMany();
    await prisma.usuario.deleteMany();
    
    console.log('🗑️  Dados existentes removidos');

    // Criar usuário admin
    const senhaHash = await hashSenha('admin123');
    const admin = await prisma.usuario.create({
      data: {
        email: 'admin@ubsf.com',
        nome: 'Administrador',
        senha: senhaHash,
        cargo: 'admin'
      }
    });
    
    console.log('👤 Usuário administrador criado');

    // Criar cronograma de exemplo para Janeiro 2024
    const cronograma1 = await prisma.cronograma.create({
      data: {
        mes: 1,
        ano: 2024,
        nomeUBSF: "UBSF Centro",
        enfermeiro: "Maria Silva Santos",
        medico: "Dr. João Carlos Oliveira",
        usuarioId: admin.id, // Associar ao usuário admin
        atividades: {
          create: [
            {
              data: new Date('2024-01-02'),
              diaSemana: 'TERÇA-MANHÃ',
              descricao: 'Consultas de rotina - Hipertensão e Diabetes'
            },
            {
              data: new Date('2024-01-03'),
              diaSemana: 'QUARTA-MANHÃ',
              descricao: 'Pré-natal'
            }
          ]
        }
      }
    });

    // Criar cronograma de exemplo para Fevereiro 2024
    const cronograma2 = await prisma.cronograma.create({
      data: {
        mes: 2,
        ano: 2024,
        nomeUBSF: "UBSF Centro",
        enfermeiro: "Maria Silva Santos",
        medico: "Dr. João Carlos Oliveira",
        usuarioId: admin.id, // Associar ao usuário admin
        atividades: {
          create: [
            {
              data: new Date('2024-02-01'),
              diaSemana: 'QUINTA-MANHÃ',
              descricao: 'Saúde da Mulher'
            },
            {
              data: new Date('2024-02-02'),
              diaSemana: 'SEXTA-MANHÃ',
              descricao: 'Saúde do Idoso'
            }
          ]
        }
      }
    });

    // Contagem final
    const totalUsuarios = await prisma.usuario.count();
    const totalCronogramas = await prisma.cronograma.count();
    const totalAtividades = await prisma.atividade.count();

    console.log('\n✅ Seed concluído com sucesso!');
    console.log('📊 Dados criados:');
    console.log(`   - Usuários: ${totalUsuarios}`);
    console.log(`   - Cronogramas: ${totalCronogramas}`);
    console.log(`   - Atividades: ${totalAtividades}`);

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();