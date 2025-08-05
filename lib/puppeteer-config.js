const chromium = require('@sparticuz/chromium');
const puppeteerCore = require('puppeteer-core');

/**
 * Cria uma instância do browser Puppeteer
 */
const createBrowser = async () => {
  let browser = null;
  
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    console.log('🔧 Usando browser de desenvolvimento');
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
  } else {
    console.log('🚀 Usando browser de produção (Vercel)');
    
    // Configuração otimizada para Vercel
    const args = [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ];
    
    browser = await puppeteerCore.launch({
      args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath({
        path: '/tmp'
      }),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  }
  
  return browser;
};

/**
 * Configurações de PDF otimizadas
 */
const getPDFOptions = () => ({
  format: 'A4',
  landscape: true,
  margin: {
    top: '10mm',
    right: '10mm',
    bottom: '10mm',
    left: '10mm'
  },
  printBackground: true,
  preferCSSPageSize: false,
  displayHeaderFooter: false
});

module.exports = {
  createBrowser,
  getPDFOptions
};