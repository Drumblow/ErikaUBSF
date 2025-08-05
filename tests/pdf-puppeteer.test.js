const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');
const { hashSenha } = require('../api/utils/auth');

const prisma = new PrismaClient();

describe('PDF Puppeteer API', () => {
  let usuarioId;
  let cronogramaId;
  let authToken;

  beforeAll(async () => {
    // Limpar dados de teste
    await prisma.atividade.deleteMany({});
    await prisma.cronograma.deleteMany({});
    await prisma.usuario.deleteMany({});

    // Criar usuário de teste
    const senhaHash = await hashSenha('123456');
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Teste PDF',
        email: 'teste.pdf@example.com',
        senha: senhaHash,
        cargo: 'Enfermeiro',
        ubsf: 'UBSF Teste PDF'
      }
    });
    usuarioId = usuario.id;

    // Fazer login para obter token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'teste.pdf@example.com',
        senha: '123456'
      });

    authToken = loginResponse.body.data.token;

    // Criar cronograma de teste
    const cronograma = await prisma.cronograma.create({
      data: {
        mes: 1,
        ano: 2024,
        ubsf: 'UBSF Teste PDF',
        usuarioId: usuarioId
      }
    });
    cronogramaId = cronograma.id;

    // Criar algumas atividades de teste
    await prisma.atividade.createMany({
      data: [
        {
          cronogramaId: cronogramaId,
          diaSemana: 'segunda',
          periodo: 'manha',
          atividade: 'Consultas médicas',
          responsavel: 'Dr. João'
        },
        {
          cronogramaId: cronogramaId,
          diaSemana: 'terca',
          periodo: 'tarde',
          atividade: 'Vacinação',
          responsavel: 'Enfermeira Maria'
        },
        {
          cronogramaId: cronogramaId,
          diaSemana: 'quarta',
          periodo: 'manha',
          atividade: 'Pré-natal',
          responsavel: 'Dra. Ana'
        }
      ]
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.atividade.deleteMany({});
    await prisma.cronograma.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/cronogramas/:id/pdf-puppeteer', () => {
    it('deve gerar PDF com sucesso usando Puppeteer', async () => {
      const response = await request(app)
        .post(`/api/cronogramas/${cronogramaId}/pdf-puppeteer`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('PDF gerado com sucesso');
      expect(response.body.data).toHaveProperty('pdf');
      expect(response.body.data.pdf).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
    }, 30000); // Timeout de 30 segundos para geração de PDF

    it('deve retornar erro 401 sem autenticação', async () => {
      const response = await request(app)
        .post(`/api/cronogramas/${cronogramaId}/pdf-puppeteer`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token não fornecido');
    });

    it('deve retornar erro 404 para cronograma inexistente', async () => {
      const response = await request(app)
        .post('/api/cronogramas/99999/pdf-puppeteer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cronograma não encontrado');
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      const response = await request(app)
        .post('/api/cronogramas/invalid-id/pdf-puppeteer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('ID do cronograma inválido');
    });
  });

  describe('Comparação com PDFShift', () => {
    it('deve gerar PDF com Puppeteer e PDFShift (se disponível)', async () => {
      // Teste com Puppeteer
      const puppeteerResponse = await request(app)
        .post(`/api/cronogramas/${cronogramaId}/pdf-puppeteer`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(puppeteerResponse.body.success).toBe(true);
      expect(puppeteerResponse.body.data.pdf).toBeDefined();

      // Teste com PDFShift (pode falhar se não configurado)
      try {
        const pdfshiftResponse = await request(app)
          .post(`/api/cronogramas/${cronogramaId}/pdf`)
          .set('Authorization', `Bearer ${authToken}`);

        if (pdfshiftResponse.status === 200) {
          expect(pdfshiftResponse.body.success).toBe(true);
          expect(pdfshiftResponse.body.data.pdf).toBeDefined();
          
          // Comparar tamanhos (Puppeteer pode gerar PDFs menores)
          const puppeteerSize = puppeteerResponse.body.data.pdf.length;
          const pdfshiftSize = pdfshiftResponse.body.data.pdf.length;
          
          console.log(`Tamanho PDF Puppeteer: ${puppeteerSize} caracteres`);
          console.log(`Tamanho PDF PDFShift: ${pdfshiftSize} caracteres`);
        }
      } catch (error) {
        console.log('PDFShift não disponível ou configurado:', error.message);
      }
    }, 45000); // Timeout maior para comparação
  });
});