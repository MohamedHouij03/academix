const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto/course.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const courseProto = grpc.loadPackageDefinition(packageDefinition).academix;

const client = new courseProto.CourseService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

console.log('🔍 Test MS1 en cours...');

client.ListCourses({ category: '', page: 1, limit: 10 }, (err, response) => {
  if (err) {
    console.error('❌ Erreur:', err.message);
    return;
  }
  
  console.log('✅ MS1 FONCTIONNE ! Courses trouvées:', response.courses.length);
  console.log('\n📚 Cours disponibles:');
  response.courses.forEach((c, i) => {
    console.log(`  ${i+1}. ${c.title} [${c.category}] - ${c.price}€`);
  });
  
  process.exit(0);
});