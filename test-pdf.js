const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const filePath = path.join(__dirname, 'cronograma-test.pdf');
const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000';

async function testPdfGeneration() {
  console.log('🧪 Iniciando teste de geração de PDF...');

  try {
    // ID do cronograma fornecido pelo usuário para o teste
    const cronogramaId = 'cmblrr9w60000cb2yehb6aqd9';
    console.log(`📄 Usando cronograma com ID (fornecido): ${cronogramaId}`);

    // 2. Chamar o endpoint da API
    const response = await fetch(`${API_URL}/api/cronogramas/${cronogramaId}/pdf`, {
      method: 'POST',
    });

    // 3. Verificar a resposta
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erro na API: Status ${response.status}. Corpo: ${errorBody}`);
    }
    
    console.log(`✅ Resposta da API recebida com sucesso (Status: ${response.status})`);
    
    // 4. Decodificar e salvar o arquivo PDF
    // A resposta agora é o buffer do PDF diretamente, não um JSON.
    const pdfBuffer = await response.arrayBuffer();
    
    await fs.writeFile(filePath, Buffer.from(pdfBuffer));

    console.log(`\n🎉 Teste concluído com sucesso!`);
    console.log(`👉 O arquivo PDF foi salvo em: ${filePath}`);
    console.log('Abra o arquivo para verificar se o layout e os dados estão corretos.');

  } catch (error) {
    console.error('❌ O teste falhou:', error.message);
    if (error.cause) {
        console.error('Causa do erro:', error.cause);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPdfGeneration(); 