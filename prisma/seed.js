const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.atividade.deleteMany();
  await prisma.cronograma.deleteMany();
  console.log('🗑️  Dados existentes removidos');

  // Criar cronograma de exemplo para Janeiro 2024
  const cronograma1 = await prisma.cronograma.create({
    data: {
      mes: 1,
      ano: 2024,
      nomeUBSF: 'UBSF Centro',
      enfermeiro: 'Maria Silva Santos',
      medico: 'Dr. João Carlos Oliveira'
    }
  });

  // Criar cronograma de exemplo para Fevereiro 2024
  const cronograma2 = await prisma.cronograma.create({
    data: {
      mes: 2,
      ano: 2024,
      nomeUBSF: 'UBSF Vila Nova',
      enfermeiro: 'Ana Paula Costa',
      medico: 'Dra. Fernanda Lima'
    }
  });

  console.log('📅 Cronogramas criados:', {
    cronograma1: `${cronograma1.mes}/${cronograma1.ano} - ${cronograma1.nomeUBSF}`,
    cronograma2: `${cronograma2.mes}/${cronograma2.ano} - ${cronograma2.nomeUBSF}`
  });

  // Atividades para Janeiro 2024
  const atividadesJaneiro = [
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-02'),
      diaSemana: 'TERÇA-MANHÃ',
      descricao: 'Consultas de rotina - Hipertensão e Diabetes'
    },
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-02'),
      diaSemana: 'TERÇA-TARDE',
      descricao: 'Vacinação infantil e pré-natal'
    },
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-03'),
      diaSemana: 'QUARTA-MANHÃ',
      descricao: 'Visitas domiciliares - Pacientes acamados'
    },
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-03'),
      diaSemana: 'QUARTA-TARDE',
      descricao: 'Grupo de educação em saúde - Alimentação saudável'
    },
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-04'),
      diaSemana: 'QUINTA-MANHÃ',
      descricao: 'Consultas ginecológicas e preventivo'
    },
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-04'),
      diaSemana: 'QUINTA-TARDE',
      descricao: 'Atendimento pediátrico'
    },
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-05'),
      diaSemana: 'SEXTA-MANHÃ',
      descricao: 'Curativos e procedimentos'
    },
    {
      cronogramaId: cronograma1.id,
      data: new Date('2024-01-05'),
      diaSemana: 'SEXTA-TARDE',
      descricao: 'Reunião de equipe e planejamento'
    }
  ];

  // Atividades para Fevereiro 2024
  const atividadesFevereiro = [
    {
      cronogramaId: cronograma2.id,
      data: new Date('2024-02-01'),
      diaSemana: 'QUINTA-MANHÃ',
      descricao: 'Campanha de vacinação contra gripe'
    },
    {
      cronogramaId: cronograma2.id,
      data: new Date('2024-02-01'),
      diaSemana: 'QUINTA-TARDE',
      descricao: 'Consultas de rotina - Idosos'
    },
    {
      cronogramaId: cronograma2.id,
      data: new Date('2024-02-02'),
      diaSemana: 'SEXTA-MANHÃ',
      descricao: 'Pré-natal e planejamento familiar'
    },
    {
      cronogramaId: cronograma2.id,
      data: new Date('2024-02-02'),
      diaSemana: 'SEXTA-TARDE',
      descricao: 'Grupo de apoio - Saúde mental'
    },
    {
      cronogramaId: cronograma2.id,
      data: new Date('2024-02-05'),
      diaSemana: 'SEGUNDA-MANHÃ',
      descricao: 'Visitas domiciliares - Área rural'
    },
    {
      cronogramaId: cronograma2.id,
      data: new Date('2024-02-05'),
      diaSemana: 'SEGUNDA-TARDE',
      descricao: 'Atendimento de urgência e emergência'
    }
  ];

  // Inserir todas as atividades
  const todasAtividades = [...atividadesJaneiro, ...atividadesFevereiro];
  
  for (const atividade of todasAtividades) {
    await prisma.atividade.create({
      data: atividade
    });
  }

  console.log(`✅ ${todasAtividades.length} atividades criadas`);
  console.log('🎉 Seed concluído com sucesso!');

  // Mostrar resumo
  const totalCronogramas = await prisma.cronograma.count();
  const totalAtividades = await prisma.atividade.count();
  
  console.log('📊 Resumo do banco de dados:');
  console.log(`   - Cronogramas: ${totalCronogramas}`);
  console.log(`   - Atividades: ${totalAtividades}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });