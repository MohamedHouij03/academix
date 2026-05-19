const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const protoPath = path.join(__dirname, '..', 'proto', 'tracking.proto');
const protoDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const onlineCourseProto = grpc.loadPackageDefinition(protoDefinition).onlinecourse;

function createTrackingClient() {
  return new onlineCourseProto.TrackingService(
    process.env.TRACKING_GRPC_URL || 'localhost:50052',
    grpc.credentials.createInsecure()
  );
}

function createCertificationClient() {
  return new onlineCourseProto.CertificationService(
    process.env.CERTIFICATION_GRPC_URL || 'localhost:50053',
    grpc.credentials.createInsecure()
  );
}

function createCourseClient() {
  return new onlineCourseProto.CourseService(
    process.env.COURSE_GRPC_URL || 'localhost:50051',
    grpc.credentials.createInsecure()
  );
}

function callGrpc(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

const resolvers = {
  Query: {
    student: async (_, { id }) => {
      const response = await callGrpc(createCourseClient(), 'GetStudent', { student_id: id });
      return response.student;
    },

    course: async (_, { id }) => {
      const response = await callGrpc(createCourseClient(), 'GetCourse', { course_id: id });
      return response.course;
    },

    progress: async (_, { student_id, course_id }) => {
      const response = await callGrpc(createTrackingClient(), 'GetProgress', { student_id, course_id });
      return response.progress;
    },

    actions: async (_, { student_id, course_id }) => {
      const response = await callGrpc(createTrackingClient(), 'GetActions', { student_id, course_id });
      return response.actions;
    },

    certificate: async (_, { student_id, course_id }) => {
      const response = await callGrpc(createCertificationClient(), 'GetCertificate', { student_id, course_id });
      return response.certificate;
    },

    certificates: async () => {
      const response = await callGrpc(createCertificationClient(), 'ListCertificates', {});
      return response.certificates;
    },

    dashboard: async (_, { student_id, course_id }) => {
      const [studentResponse, courseResponse, progressResponse, certificateResponse] = await Promise.allSettled([
        callGrpc(createCourseClient(), 'GetStudent', { student_id }),
        callGrpc(createCourseClient(), 'GetCourse', { course_id }),
        callGrpc(createTrackingClient(), 'GetProgress', { student_id, course_id }),
        callGrpc(createCertificationClient(), 'GetCertificate', { student_id, course_id })
      ]);

      return {
        student: studentResponse.status === 'fulfilled' ? studentResponse.value.student : null,
        course: courseResponse.status === 'fulfilled' ? courseResponse.value.course : null,
        progress: progressResponse.status === 'fulfilled' ? progressResponse.value.progress : null,
        certificate: certificateResponse.status === 'fulfilled' ? certificateResponse.value.certificate : null
      };
    }
  },

  Mutation: {
    recordAction: async (_, args) => {
      return callGrpc(createTrackingClient(), 'RecordAction', args);
    },

    issueCertificate: async (_, args) => {
      return callGrpc(createCertificationClient(), 'IssueCertificate', args);
    }
  }
};

module.exports = resolvers;
