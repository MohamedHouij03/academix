const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Charger le proto
const PROTO_PATH = path.join(__dirname, '../proto/course.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const courseProto = grpc.loadPackageDefinition(packageDefinition).pedagora;

// Importer vos services/logique
const CourseModel = require('./models/course');
const UserModel = require('./models/user');
const EnrollmentModel = require('./models/enrollment');
const CourseService = require('./services/courseService');

// Implémenter les méthodes RPC
function getCourse(call, callback) {
  const { id } = call.request;
  
  CourseModel.getById(id)
    .then(course => {
      if (!course) {
        callback(null, { course: {}, found: false });
      } else {
        callback(null, { course, found: true });
      }
    })
    .catch(err => callback(err));
}

function listCourses(call, callback) {
  const { category, page = 1, limit = 10 } = call.request;
  const offset = (page - 1) * limit;
  
  CourseModel.getAll(category, limit, offset)
    .then(courses => {
      callback(null, { courses, total: courses.length }); // Simplifié, comptez total séparément si besoin
    })
    .catch(err => callback(err));
}

function createUser(call, callback) {
  const { name, email, password, role } = call.request;
  const id = require('uuid').v4(); // ou crypto.randomUUID()
  
  UserModel.create({ id, name, email, password, role: role || 'student' })
    .then(user => callback(null, { user, success: true, message: 'Utilisateur créé' }))
    .catch(err => {
      if (err.message?.includes('UNIQUE')) {
        callback(null, { user: {}, success: false, message: 'Email déjà utilisé' });
      } else {
        callback(err);
      }
    });
}

async function createEnrollment(call, callback) {
  try {
    const result = await CourseService.createEnrollment(
      call.request.user_id, 
      call.request.course_id
    );
    callback(null, result);
  } catch (err) {
    callback(err);
  }
}

function getUserEnrollments(call, callback) {
  CourseService.getUserEnrollments(call.request.user_id)
    .then(enrollments => {
      // Transformer les lignes SQL en objets protobuf propres
      const result = enrollments.map(e => ({
        id: e.id,
        user_id: e.user_id,
        course_id: e.course_id,
        status: e.status,
        progress: e.progress,
        enrolled_at: e.enrolled_at
      }));
      
      // Aussi retourner les infos des cours (simplifié)
      const courses = enrollments.map(e => ({
        id: e.course_id,
        title: e.course_title,
        category: e.category
      }));
      
      callback(null, { enrollments: result, courses });
    })
    .catch(err => callback(err));
}

// Démarrer le serveur
function main() {
  const server = new grpc.Server();
  
  server.addService(courseProto.CourseService.service, {
    GetCourse: getCourse,
    ListCourses: listCourses,
    CreateUser: createUser,
    CreateEnrollment: createEnrollment,
    GetUserEnrollments: getUserEnrollments
  });
  
  const address = '0.0.0.0:50051';
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Erreur démarrage gRPC:', err);
      return;
    }
    console.log(`✅ MS1-Pédagogique gRPC running on ${address}`);
    server.start();
  });
}

main();