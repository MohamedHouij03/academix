const db = require('../database');
const { v4: uuidv4 } = require('uuid'); // npm install uuid

class CourseModel {
  
  static getAll(category = null, limit = 10, offset = 0) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM courses';
      const params = [];
      
      if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM courses WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static create(courseData) {
    return new Promise((resolve, reject) => {
      const { title, description, category, duration_hours, price } = courseData;
      const id = uuidv4();
      
      db.run(
        `INSERT INTO courses (id, title, description, category, duration_hours, price) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, title, description || '', category || 'general', duration_hours || 0, price || 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...courseData });
        }
      );
    });
  }
}

module.exports = CourseModel;