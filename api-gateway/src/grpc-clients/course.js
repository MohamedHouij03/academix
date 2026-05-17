const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Charger la définition (MÊME fichier que MS1)
const PROTO_PATH = path.join(__dirname, '../../proto/course.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const courseProto = grpc.loadPackageDefinition(packageDefinition).pedagora;

// Créer le client (se connecte à MS1 sur port 50051)
function createCourseClient() {
  return new courseProto.CourseService(
    'localhost:50051',  // MS1 tourne ici
    grpc.credentials.createInsecure()
  );
}

module.exports = { createCourseClient };