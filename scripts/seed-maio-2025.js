const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Primeiro, vamos deletar o cronograma anterior se existir
    await prisma.cronograma.deleteMany({
      where: {
        mes: 5,
        ano: 2025,
        nomeUBSF: "Itaperinha"
      }
    });

    // Criar o cronograma base
    const cronograma = await prisma.cronograma.create({
      data: {
        mes: 5, // Maio
        ano: 2025,
        nomeUBSF: "Itaperinha",
        enfermeiro: "Erika Soares de Caldas",
        medico: "Parmenio",
        atividades: {
          create: [
            // Semana 1
            {
              data: new Date("2025-05-01"),
              diaSemana: "QUINTA – MANHÃ",
              descricao: "Atendimento Geral"
            },
            {
              data: new Date("2025-05-02"),
              diaSemana: "SEXTA – MANHÃ",
              descricao: "Visita Domiciliar"
            },
            // Semana 2
            {
              data: new Date("2025-05-05"),
              diaSemana: "SEGUNDA – MANHÃ",
              descricao: "Consulta Pediátrica"
            },
            {
              data: new Date("2025-05-06"),
              diaSemana: "TERÇA – MANHÃ",
              descricao: "Pré-natal"
            },
            {
              data: new Date("2025-05-07"),
              diaSemana: "QUARTA – MANHÃ",
              descricao: "Saúde da Mulher"
            },
            {
              data: new Date("2025-05-08"),
              diaSemana: "QUINTA – MANHÃ",
              descricao: "Hiperdia"
            },
            {
              data: new Date("2025-05-09"),
              diaSemana: "SEXTA – MANHÃ",
              descricao: "Planejamento Familiar"
            },
            // Semana 3
            {
              data: new Date("2025-05-12"),
              diaSemana: "SEGUNDA – MANHÃ",
              descricao: "Atendimento Geral"
            },
            {
              data: new Date("2025-05-13"),
              diaSemana: "TERÇA – MANHÃ",
              descricao: "Pré-natal"
            },
            {
              data: new Date("2025-05-14"),
              diaSemana: "QUARTA – MANHÃ",
              descricao: "Saúde Mental"
            },
            {
              data: new Date("2025-05-15"),
              diaSemana: "QUINTA – MANHÃ",
              descricao: "Hiperdia"
            },
            {
              data: new Date("2025-05-16"),
              diaSemana: "SEXTA – MANHÃ",
              descricao: "Visita Domiciliar"
            },
            // Semana 4
            {
              data: new Date("2025-05-19"),
              diaSemana: "SEGUNDA – MANHÃ",
              descricao: "Consulta Pediátrica"
            },
            {
              data: new Date("2025-05-20"),
              diaSemana: "TERÇA – MANHÃ",
              descricao: "Pré-natal"
            },
            {
              data: new Date("2025-05-21"),
              diaSemana: "QUARTA – MANHÃ",
              descricao: "Saúde da Mulher"
            },
            {
              data: new Date("2025-05-22"),
              diaSemana: "QUINTA – MANHÃ",
              descricao: "Hiperdia"
            },
            {
              data: new Date("2025-05-23"),
              diaSemana: "SEXTA – MANHÃ",
              descricao: "Planejamento Familiar"
            },
            // Semana 5
            {
              data: new Date("2025-05-26"),
              diaSemana: "SEGUNDA – MANHÃ",
              descricao: "Atendimento Geral"
            },
            {
              data: new Date("2025-05-27"),
              diaSemana: "TERÇA – MANHÃ",
              descricao: "Pré-natal"
            },
            {
              data: new Date("2025-05-28"),
              diaSemana: "QUARTA – MANHÃ",
              descricao: "Saúde Mental"
            },
            {
              data: new Date("2025-05-29"),
              diaSemana: "QUINTA – MANHÃ",
              descricao: "Hiperdia"
            },
            {
              data: new Date("2025-05-30"),
              diaSemana: "SEXTA – MANHÃ",
              descricao: "Visita Domiciliar"
            }
          ]
        }
      }
    });

    console.log('✅ Dados do cronograma de Maio/2025 inseridos com sucesso!');
    console.log('ID do cronograma:', cronograma.id);
  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 