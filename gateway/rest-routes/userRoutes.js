const express = require('express');
const router = express.Router();
const { createCourseClient } = require('../grpc-clients/course');
const { v4: uuidv4 } = require('uuid');

// POST /api/users - Créer un utilisateur
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email et password sont obligatoires'
      });
    }

    const client = createCourseClient();
    
    const response = await new Promise((resolve, reject) => {
      client.CreateUser({
        name,
        email,
        password, // En clair pour l'instant (à hasher plus tard)
        role: role || 'student'
      }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });

    res.status(201).json({
      success: response.success,
      data: response.user,
      message: response.message
    });

  } catch (error) {
    // Gérer erreur "Email déjà utilisé" venant de MS1
    if (error.message.includes('UNIQUE') || error.code === 6) {
      return res.status(409).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;