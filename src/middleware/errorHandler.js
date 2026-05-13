export const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur:', err.stack);
  
  const status = err.status || 500;
  const message = err.message || 'Erreur interne du serveur';
  
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} non trouvée` });
};
