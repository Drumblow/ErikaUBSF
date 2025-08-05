// Rota principal de PDF - usa Puppeteer como implementação padrão
const pdfPuppeteerHandler = require('./pdf-puppeteer');

module.exports = async (req, res) => {
  // Redireciona para a implementação do Puppeteer
  return await pdfPuppeteerHandler(req, res);
};