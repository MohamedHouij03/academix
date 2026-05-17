const express = require('express');
const router = express.Router();
const { createCourseClient } = require('../grpc-clients/course');

// POST /api/inscriptions - Inscrire un étudiant à un cours
router.post('/', async (req, res) => {
  try {
    const { user_id, course_id } = req.body;
    
    if (!user_id || !course_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id et course_id sont obligatoires'
      });
    }

    const client = createCourseClient();
    
    const response = await new Promise((resolve, reject) => {
      client.CreateEnrollment({
        user_id,
        course_id
      }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });

    if (!response.success && response.message.includes('Déjà inscrit')) {
      return res.status(409).json({
        success: false,
        message: response.message,
        enrollment: response.enrollment
      });
    }

    res.status(201).json({
      success: true,
      data: response.enrollment,
      message: response.message
      // ICI : Plus tard, on pourra déclencher un event Kafka ici pour prévenir MS2/MS3
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/inscriptions/:user_id - Voir les cours d'un étudiant
router.get('/:user_id', async (req, res) => {
  try {
    const client = createCourseClient();
    
    const response = await new Promise((resolve, reject) => {
      client.GetUserEnrollments({ user_id: req.params.user_id }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });

    res.json({
      success: true,
      data: response.enrollments,
      courses: response.courses
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;