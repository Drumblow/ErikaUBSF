const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { hashSenha } = require('../api/utils/auth');

const prisma = new PrismaClient();
const app = 'http://localhost:3000';

describe('Sistema de Usuários', () => {
  let testUser;
  let testToken;

  beforeAll(async () => {
    // Limpar dados de teste anteriores
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
    await prisma.usuario.deleteMany({
      where: {
        email: {
          contains: 'test@'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('Cadastro de Usuário', () => {
    it('deve cadastrar um novo usuário com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: 'test@example.com',
          nome: 'Usuário Teste',
          senha: 'senha123',
          cargo: 'enfermeiro'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usuario).toHaveProperty('id');
      expect(response.body.data.usuario.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();

      testUser = response.body.data.usuario;
      testToken = response.body.data.token;
    });

    it('não deve permitir cadastro com email duplicado', async () => {
      const response = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: 'test@example.com',
          nome: 'Outro Usuário',
          senha: 'outrasenha123',
          cargo: 'medico'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Login de Usuário', () => {
    it('deve fazer login com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          senha: 'senha123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('não deve permitir login com credenciais inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          senha: 'senhaerrada'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Atualização de Usuário', () => {
    it('deve atualizar dados do usuário com sucesso', async () => {
      const response = await request(app)
        .put(`/api/auth/usuarios/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          nome: 'Usuário Teste Atualizado'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nome).toBe('Usuário Teste Atualizado');
    });

    it('não deve permitir atualização sem autenticação', async () => {
      const response = await request(app)
        .put(`/api/auth/usuarios/${testUser.id}`)
        .send({
          nome: 'Tentativa de Atualização'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Integração com Cronogramas', () => {
    let testCronograma;

    it('deve criar cronograma associado ao usuário', async () => {
      const response = await request(app)
        .post('/api/cronogramas')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mes: 1,
          ano: 2024,
          nomeUBSF: 'UBSF Teste',
          enfermeiro: 'Enfermeiro Teste',
          medico: 'Médico Teste'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usuarioId).toBe(testUser.id);

      testCronograma = response.body.data;
    });

    it('deve listar apenas cronogramas do usuário', async () => {
      const response = await request(app)
        .get('/api/cronogramas')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cronogramas).toHaveLength(1);
      expect(response.body.data.cronogramas[0].id).toBe(testCronograma.id);
    });

    it('não deve permitir acesso ao cronograma de outro usuário', async () => {
      // Criar outro usuário
      const outroUsuario = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: 'test2@example.com',
          nome: 'Outro Usuário',
          senha: 'senha123',
          cargo: 'enfermeiro'
        });

      const outroToken = outroUsuario.body.data.token;

      // Tentar acessar cronograma do primeiro usuário
      const response = await request(app)
        .get(`/api/cronogramas/${testCronograma.id}`)
        .set('Authorization', `Bearer ${outroToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Exclusão de Usuário', () => {
    it('deve excluir usuário com sucesso', async () => {
      const response = await request(app)
        .delete(`/api/auth/usuarios/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('não deve permitir acesso após exclusão', async () => {
      const response = await request(app)
        .get('/api/cronogramas')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
}); 