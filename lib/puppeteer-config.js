const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer');
const puppeteerCore = require('puppeteer-core');

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV;

// Configuração recomendada pela documentação oficial do @sparticuz/chromium
const getBrowser = async () => {
  if (isProduction) {
    // Configuração oficial para Vercel/produção usando chromium-min
    const viewport = {
      deviceScaleFactor: 1,
      hasTouch: false,
      height: 1080,
      isLandscape: true,
      isMobile: false,
      width: 1920,
    };

    return await puppeteerCore.launch({
      args: puppeteerCore.defaultArgs({ 
        args: chromium.args, 
        headless: "shell" 
      }),
      defaultViewport: viewport,
      // Usar Chromium hospedado no GitHub (documentação oficial)
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      ),
      headless: "shell", // Recomendação oficial para serverless
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