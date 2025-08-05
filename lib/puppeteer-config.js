const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer');
const puppeteerCore = require('puppeteer-core');

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV;

const getBrowser = async () => {
  if (isProduction) {
    // Configuração para Vercel/produção usando chromium-min com Chromium hospedado externamente
    return await puppeteerCore.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--hide-scrollbars',
        '--disable-web-security'
      ],
      defaultViewport: chromium.defaultViewport,
      // Usar Chromium hospedado no GitHub para evitar problemas de dependência
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      ),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } else {
    // Configuração para desenvolvimento local
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
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
  getBrowser,
  getPDFOptions
};