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
    if (error.code === 5 || error.code === 3) { // NOT_FOUND (5) or INVALID_ARGUMENT (3)
      return res.status(error.code === 5 ? 404 : 400).json({ success: false, error: error.details || error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT/PATCH /api/cours/:id - Modifier un cours
const updateHandler = async (req, res) => {
  try {
    const client = createCourseClient();
    const data = { id: req.params.id, ...req.body };
    
    const response = await new Promise((resolve, reject) => {
      client.UpdateCourse(data, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });

    res.json({
      success: true,
      data: response.course,
      message: response.message
    });

  } catch (error) {
    if (error.code === 5 || error.code === 3) { // NOT_FOUND or INVALID_ARGUMENT
      return res.status(error.code === 5 ? 404 : 400).json({ success: false, error: error.details || error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

router.put('/:id', updateHandler);
router.patch('/:id', updateHandler);

// DELETE /api/cours/:id - Supprimer un cours
router.delete('/:id', async (req, res) => {
  try {
    const client = createCourseClient();
    
    const response = await new Promise((resolve, reject) => {
      client.DeleteCourse({ id: req.params.id }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });

    res.json({
      success: true,
      message: response.message
    });

  } catch (error) {
    if (error.code === 5 || error.code === 3) { // NOT_FOUND or INVALID_ARGUMENT
      return res.status(error.code === 5 ? 404 : 400).json({ success: false, error: error.details || error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;