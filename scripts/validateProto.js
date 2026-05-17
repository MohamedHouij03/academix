const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const protoPath = path.join(__dirname, '..', 'proto', 'tracking.proto');
const definition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const loaded = grpc.loadPackageDefinition(definition).onlinecourse;
const requiredServices = ['TrackingService', 'CertificationService', 'CourseService'];
const missingServices = requiredServices.filter((serviceName) => !loaded[serviceName]);

if (missingServices.length > 0) {
  throw new Error(`Services manquants dans tracking.proto: ${missingServices.join(', ')}`);
}

console.log('tracking.proto valide');
console.log(`Services trouves: ${requiredServices.join(', ')}`);
