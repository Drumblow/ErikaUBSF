const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../server');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

describe('Geração de PDF', () => {
  let testUser;
  let testToken;
  let cronogramaId;

  beforeAll(async () => {
    // Criar usuário de teste
    const response = await request(app)
      .post('/api/auth/cadastro')
      .send({
        email: `test-pdf-${Date.now()}@example.com`,
        nome: 'Usuário Teste PDF',
        senha: 'senha123',
        cargo: 'enfermeiro'
      });

    testUser = response.body.data.usuario;
    testToken = response.body.data.token;

    // Criar cronograma de teste
    const cronogramaRes = await request(app)
      .post('/api/cronogramas')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        mes: 6,
        ano: 2025,
        nomeUBSF: "UBSF Teste PDF",
        enfermeiro: "Enf. Teste",
        medico: "Dr. Teste"
      });

    cronogramaId = cronogramaRes.body.data.id;

    // Adicionar algumas atividades
    await request(app)
      .post(`/api/cronogramas/${cronogramaId}/atividades`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        data: '2025-06-02',
        diaSemana: 'SEGUNDA-MANHÃ',
        descricao: 'Consulta de rotina'
      });
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (cronogramaId) {
      await prisma.atividade.deleteMany({
        where: {
          cronogramaId
        }
      });
      await prisma.cronograma.delete({
        where: {
          id: cronogramaId
        }
      }).catch(() => {});
    }
    
    if (testUser?.id) {
      await prisma.usuario.delete({
        where: {
          id: testUser.id
        }
      }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  it('deve gerar PDF do cronograma com sucesso', async () => {
    const response = await request(app)
      .post(`/api/cronogramas/${cronogramaId}/pdf`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('pdfBase64');

    // Verificar se o PDF pode ser salvo
    const pdfBuffer = Buffer.from(response.body.data.pdfBase64, 'base64');
    const outputPath = path.join(__dirname, 'output.pdf');
    await fs.writeFile(outputPath, pdfBuffer);

    // Verificar se o arquivo foi criado
    const fileStats = await fs.stat(outputPath);
    expect(fileStats.size).toBeGreaterThan(0);

    // Limpar arquivo de teste
    await fs.unlink(outputPath);
  });

  it('não deve gerar PDF para cronograma inexistente', async () => {
    const response = await request(app)
      .post('/api/cronogramas/cronograma-inexistente/pdf')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('não encontrado');
  });

  it('não deve gerar PDF sem autenticação', async () => {
    const response = await request(app)
      .post(`/api/cronogramas/${cronogramaId}/pdf`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Token');
  });

  it('não deve gerar PDF de cronograma de outro usuário', async () => {
    // Criar outro usuário
    const outroUsuario = await request(app)
      .post('/api/auth/cadastro')
      .send({
        email: `outro-user-pdf-${Date.now()}@example.com`,
        nome: 'Outro Usuário PDF',
        senha: 'senha123',
        cargo: 'enfermeiro'
      });

    const outroToken = outroUsuario.body.data.token;

    // Tentar gerar PDF do cronograma do primeiro usuário
    const response = await request(app)
      .post(`/api/cronogramas/${cronogramaId}/pdf`)
      .set('Authorization', `Bearer ${outroToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('permissão');

    // Limpar outro usuário
    await prisma.usuario.delete({
      where: {
        id: outroUsuario.body.data.usuario.id
      }
    }).catch(() => {});
  });
}); 