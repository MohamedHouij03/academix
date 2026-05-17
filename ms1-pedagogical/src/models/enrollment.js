const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class EnrollmentModel {

  static create(enrollmentData) {
    return new Promise((resolve, reject) => {
      const { user_id, course_id, status, progress } = enrollmentData;
      const id = uuidv4();
      
      db.run(
        'INSERT INTO enrollments (id, user_id, course_id, status, progress) VALUES (?, ?, ?, ?, ?)',
        [id, user_id, course_id, status || 'active', progress || 0.0],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              // Si déjà inscrit, on retourne l'inscription existante
              return EnrollmentModel.findByUserAndCourse(user_id, course_id)
                .then(existing => resolve(existing))
                .catch(() => reject(err));
            }
            reject(err);
          } else {
            resolve({ id, ...enrollmentData, enrolled_at: new Date().toISOString() });
          }
        }
      );
    });
  }

  static findByUserAndCourse(userId, courseId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', 
        [userId, courseId], 
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static getByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT e.*, c.title as course_title, c.category, c.duration_hours FROM enrollments e LEFT JOIN courses c ON e.course_id = c.id WHERE e.user_id = ? ORDER BY e.enrolled_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = EnrollmentModel;