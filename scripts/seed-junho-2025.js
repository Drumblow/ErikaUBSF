const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Primeiro, vamos deletar o cronograma anterior se existir
    await prisma.cronograma.deleteMany({
      where: {
        mes: 6,
        ano: 2025,
        nomeUBSF: "Itaperinha"
      }
    });

    // Criar o cronograma base
    const cronograma = await prisma.cronograma.create({
      data: {
        mes: 6, // Junho
        ano: 2025,
        nomeUBSF: "Itaperinha",
        enfermeiro: "Erika Soares de Caldas",
        medico: "Parmenio",
        atividades: {
          create: [
            // Semana 1
            {
              data: new Date("2025-06-02"),
              diaSemana: "SEGUNDA-MANHÃ",
              descricao: "Bolsa Família\n(Pov. Mangueira)"
            },
            {
              data: new Date("2025-06-03"),
              diaSemana: "TERÇA-MANHÃ",
              descricao: "Bolsa Família\n(Pov. Mangueira)"
            },
            {
              data: new Date("2025-06-04"),
              diaSemana: "QUARTA-MANHÃ",
              descricao: "Bolsa Família\n(Pov. Mangueira)"
            },
            {
              data: new Date("2025-06-05"),
              diaSemana: "QUINTA-MANHÃ",
              descricao: "Bolsa Família\n+ Vacina\n(Pov. Córrego)"
            },
            {
              data: new Date("2025-06-06"),
              diaSemana: "SEXTA-MANHÃ",
              descricao: ""
            },

            // Semana 2
            {
              data: new Date("2025-06-09"),
              diaSemana: "SEGUNDA-MANHÃ",
              descricao: "Bolsa Família\n(Pov. Bolota)"
            },
            {
              data: new Date("2025-06-10"),
              diaSemana: "TERÇA-MANHÃ",
              descricao: "Pré-natal\n+ Vacina\n(Acs Bete)"
            },
            {
              data: new Date("2025-06-11"),
              diaSemana: "QUARTA-MANHÃ",
              descricao: "Pré-natal\n+ vacina\n(Acs Cris)"
            },
            {
              data: new Date("2025-06-12"),
              diaSemana: "QUINTA-MANHÃ",
              descricao: "Pré-natal\n+ vacina\n(Acs Maria José)"
            },
            {
              data: new Date("2025-06-13"),
              diaSemana: "SEXTA-MANHÃ",
              descricao: ""
            },

            // Semana 3
            {
              data: new Date("2025-06-16"),
              diaSemana: "SEGUNDA-MANHÃ",
              descricao: "Demanda livre\n+ Vacina"
            },
            {
              data: new Date("2025-06-17"),
              diaSemana: "TERÇA-MANHÃ",
              descricao: "Reunião do planific"
            },
            {
              data: new Date("2025-06-18"),
              diaSemana: "QUARTA-MANHÃ",
              descricao: "Hiperdia\n+ Vacina"
            },
            {
              data: new Date("2025-06-19"),
              diaSemana: "QUINTA-MANHÃ",
              descricao: "Feriado"
            },
            {
              data: new Date("2025-06-20"),
              diaSemana: "SEXTA-MANHÃ",
              descricao: ""
            },

            // Semana 4
            {
              data: new Date("2025-06-23"),
              diaSemana: "SEGUNDA-MANHÃ",
              descricao: "Campanha contra a influenza\nAcs Cris - Criança\n(Povoado São Roque)"
            },
            {
              data: new Date("2025-06-24"),
              diaSemana: "TERÇA-MANHÃ",
              descricao: "Vacina contra HPV\n+ Demanda livre\n(Acs Cris)"
            },
            {
              data: new Date("2025-06-25"),
              diaSemana: "QUARTA-MANHÃ",
              descricao: "Quilombos\nVacina Influenza\n(Acs Cris)"
            },
            {
              data: new Date("2025-06-26"),
              diaSemana: "QUINTA-MANHÃ",
              descricao: "Vacina\nPovoado Santa Clara\n(Acs Bete)"
            },
            {
              data: new Date("2025-06-27"),
              diaSemana: "SEXTA-MANHÃ",
              descricao: ""
            },

            // Semana 5
            {
              data: new Date("2025-06-30"),
              diaSemana: "SEGUNDA-MANHÃ",
              descricao: "Campanha contra a influenza\n+ Idoso\n+ Criança\nVacina contra HPV\n(Povoado Mangueira)"
            }
          ]
        }
      }
    });

    console.log('✅ Dados do cronograma de Junho/2025 inseridos com sucesso!');
    console.log('ID do cronograma:', cronograma.id);
  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 