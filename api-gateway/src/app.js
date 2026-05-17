const express = require('express');
const cors = require('cors');
const courseRoutes = require('./rest-routes/courseRoutes');
const userRoutes = require('./rest-routes/userRoutes');
const enrollmentRoutes = require('./rest-routes/enrollmentRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());              // Permet au frontend d'appeler cette API
app.use(express.json());      // Parse les bodies JSON

// Routes
app.use('/api/cours', courseRoutes);           // /api/cours, /api/cours/:id
app.use('/api/users', userRoutes);             // /api/users (POST)
app.use('/api/inscriptions', enrollmentRoutes); // /api/inscriptions

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Pedagora API Gateway REST',
    version: '1.0.0',
    timestamp: new Date(),
    ms1_status: 'connected_via_grpc' // Indique qu'on parle à MS1
  });
});

// Gestion erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway REST running on http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   GET  http://localhost:${PORT}/api/cours`);
  console.log(`   GET  http://localhost:${PORT}/api/cours/:id`);
  console.log(`   POST http://localhost:${PORT}/api/users`);
  console.log(`   POST http://localhost:${PORT}/api/inscriptions`);
  console.log(`   GET  http://localhost:${PORT}/health`);
});