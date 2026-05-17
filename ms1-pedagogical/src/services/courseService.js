const CourseModel = require('../models/course');
const UserModel = require('../models/user');
const EnrollmentModel = require('../models/enrollment');
const { emitEnrollmentCreated } = require('./kafkaService');

class CourseService {

  // Créer une inscription avec règles métier
  static async createEnrollment(userId, courseId) {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Vérifier que l'utilisateur existe
        const user = await UserModel.getById(userId);
        if (!user) {
          return resolve({
            success: false,
            message: 'Utilisateur non trouvé'
          });
        }

        // 2. Vérifier que le cours existe
        const course = await CourseModel.getById(courseId);
        if (!course) {
          return resolve({
            success: false,
            message: 'Cours non trouvé'
          });
        }

        // 3. Vérifier si déjà inscrit (UNIQUE constraint dans SQL, 
        //    mais on gère l'erreur proprement)
        const existing = await EnrollmentModel.findByUserAndCourse(userId, courseId);
        if (existing) {
          return resolve({
            success: false,
            message: 'Déjà inscrit à ce cours',
            enrollment: existing
          });
        }

        // 4. Créer l'inscription
        const enrollment = await EnrollmentModel.create({
          user_id: userId,
          course_id: courseId,
          status: 'active',
          progress: 0.0
        });

        // 5. Envoyer un event Kafka pour prévenir MS2 et MS3
        await emitEnrollmentCreated(enrollment);
        
        resolve({
          success: true,
          message: 'Inscription réussie',
          enrollment
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Récupérer les inscriptions d'un user avec détails du cours (jointure)
  static async getUserEnrollments(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, c.title as course_title, c.category, c.duration_hours
        FROM enrollments e
        LEFT JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ?
        ORDER BY e.enrolled_at DESC
      `;
      
      db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = CourseService;