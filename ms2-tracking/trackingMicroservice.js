const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const trackingResolver = require('./trackingResolver');

const protoPath = path.join(__dirname, '..', 'proto', 'tracking.proto');
const protoDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const onlineCourseProto = grpc.loadPackageDefinition(protoDefinition).onlinecourse;

const trackingService = {
  RecordAction: async (call, callback) => {
    try {
      const result = await trackingResolver.recordAction(call.request);
      callback(null, result);
    } catch (error) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: error.message
      });
    }
  },

  GetProgress: async (call, callback) => {
    try {
      const progress = await trackingResolver.calculateProgress(
        call.request.student_id,
        call.request.course_id
      );
      callback(null, { progress });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  },

  GetActions: async (call, callback) => {
    try {
      const actions = await trackingResolver.getActionsByStudentAndCourse(
        call.request.student_id,
        call.request.course_id
      );
      callback(null, { actions });
    } catch (error) {
      callback({
        code: grpc.status.INTERNAL,
        details: error.message
      });
    }
  }
};

const server = new grpc.Server();
server.addService(onlineCourseProto.TrackingService.service, trackingService);

const port = process.env.TRACKING_GRPC_PORT || 50052;
server.bindAsync(
  `0.0.0.0:${port}`,
  grpc.ServerCredentials.createInsecure(),
  (err, boundPort) => {
    if (err) {
      console.error('Echec de la liaison du serveur Tracking:', err);
      return;
    }
    console.log(`MS2 Tracking en cours d'execution sur le port ${boundPort}`);
  }
);
