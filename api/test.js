// Arquivo de teste simples para verificar se o deploy funciona
module.exports = (req, res) => {
  res.status(200).json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};