const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const certificationResolver = require('./certificationResolver');
const { startKafkaConsumer } = require('./kafkaConsumer');

const protoPath = path.join(__dirname, '..', 'proto', 'tracking.proto');
const protoDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const onlineCourseProto = grpc.loadPackageDefinition(protoDefinition).onlinecourse;

const certificationService = {
  IssueCertificate: async (call, callback) => {
    try {
      const result = await certificationResolver.issueCertificate(call.request);
      callback(null, result);
    } catch (error) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: error.message
      });
    }
  },

  GetCertificate: async (call, callback) => {
    try {
      const certificate = await certificationResolver.getCertificate(
        call.request.student_id,
        call.request.course_id
      );
      callback(null, { certificate });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },

  ListCertificates: async (call, callback) => {
    try {
      const certificates = await certificationResolver.listCertificates();
      callback(null, { certificates });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  }
};

const server = new grpc.Server();
server.addService(onlineCourseProto.CertificationService.service, certificationService);

const port = process.env.CERTIFICATION_GRPC_PORT || 50053;
server.bindAsync(
  `0.0.0.0:${port}`,
  grpc.ServerCredentials.createInsecure(),
  (err, boundPort) => {
    if (err) {
      console.error('Echec de la liaison du serveur Certification:', err);
      return;
    }
    console.log(`MS3 Certification en cours d'execution sur le port ${boundPort}`);
    startKafkaConsumer();
  }
);
