// Au lieu de créer sa propre connexion, le seed utilise la même BDD
const db = require('./database'); // Importe la connexion existante
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('🌱 Seeding database...');
  
  // Attendre un peu que la BDD soit prête
  await new Promise(r => setTimeout(r, 100));
  
  try {
    const users = [
      { id: uuidv4(), name: 'Alice Student', email: 'alice@test.com', password: '123', role: 'student' },
      { id: uuidv4(), name: 'Bob Instructor', email: 'bob@test.com', password: '123', role: 'instructor' },
      { id: uuidv4(), name: 'Charlie Admin', email: 'charlie@test.com', password: '123', role: 'admin' }
    ];
    
    for (const u of users) {
      db.run('INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, u.password, u.role]);
    }
    
    const courses = [
      { id: uuidv4(), title: 'Introduction à Node.js', description: 'Backend JavaScript moderne', category: 'development', duration_hours: 10, price: 0 },
      { id: uuidv4(), title: 'GraphQL Avancé', description: 'API flexibles et puissantes', category: 'development', duration_hours: 15, price: 49.99 },
      { id: uuidv4(), title: 'Design UI/UX', description: 'Interfaces utilisateur modernes', category: 'design', duration_hours: 20, price: 29.99 },
      { id: uuidv4(), title: 'Microservices Architecture', description: 'Systèmes distribués et scalables', category: 'architecture', duration_hours: 25, price: 79.99 },
      { id: uuidv4(), title: 'Docker & Kubernetes', description: 'Containerisation et orchestration', category: 'devops', duration_hours: 12, price: 39.99 }
    ];
    
    for (const c of courses) {
      db.run('INSERT OR IGNORE INTO courses (id, title, description, category, duration_hours, price) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.title, c.description, c.category, c.duration_hours, c.price]);
    }
    
    console.log('✅ Seed terminé ! 5 cours + 3 utilisateurs créés.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur seed:', error.message);
    process.exit(1);
  }
}

seed();