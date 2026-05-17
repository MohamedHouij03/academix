const express = require('express');
const router = express.Router();
const { createCourseClient } = require('../grpc-clients/course');

// GET /api/cours - Lister tous les cours
router.get('/', async (req, res) => {
  try {
    const client = createCourseClient();
    
    // Appel gRPC vers MS1 (comme un appel fonction mais à distance)
    const response = await new Promise((resolve, reject) => {
      client.ListCourses({
        category: req.query.category || '',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });

    res.json({
      success: true,
      data: response.courses,
      total: response.total,
      message: 'Liste des cours récupérée depuis MS1 via gRPC'
    });

  } catch (error) {
    console.error('Erreur Gateway -> MS1:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Service pédagogique indisponible' 
    });
  }
});

// GET /api/cours/:id - Détail d'un cours
router.get('/:id', async (req, res) => {
  try {
    const client = createCourseClient();
    
    const response = await new Promise((resolve, reject) => {
      client.GetCourse({ id: req.params.id }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });

    if (!response.found) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cours non trouvé' 
      });
    }

    res.json({
      success: true,
      data: response.course
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;