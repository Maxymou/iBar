require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// Validate required env vars and detect placeholder values
const REQUIRED_VARS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
const missing = REQUIRED_VARS.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`ERREUR : variables d'environnement manquantes : ${missing.join(', ')}`);
  console.error('Copiez .env.example vers .env et renseignez les valeurs.');
  process.exit(1);
}
const PLACEHOLDER_PATTERN = /^changeme/i;
const SENSITIVE_VARS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
const placeholders = SENSITIVE_VARS.filter(
  k => process.env[k] && PLACEHOLDER_PATTERN.test(process.env[k])
);
if (placeholders.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`ERREUR : variables avec valeurs par défaut non modifiées : ${placeholders.join(', ')}`);
  console.error('Éditez votre fichier .env avec de vraies valeurs sécurisées.');
  process.exit(1);
} else if (placeholders.length > 0) {
  console.warn(`AVERTISSEMENT : ${placeholders.join(', ')} utilisent des valeurs par défaut.`);
  console.warn('Ne pas utiliser en production.');
}

// Ensure required runtime directories exist
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(__dirname, '../logs'), { recursive: true });

const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const accommodationRoutes = require('./routes/accommodations');
const userRoutes = require('./routes/users');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// Static files - uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/export', exportRoutes);

// Health check (used by install.sh and monitoring)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ IBar API démarré sur le port ${PORT}`);
  console.log(`   Frontend: http://0.0.0.0:${PORT}`);
  console.log(`   API:      http://0.0.0.0:${PORT}/api`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Please stop the existing process.`);
    process.exit(1);
  } else {
    throw error;
  }
});
