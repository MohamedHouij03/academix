const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// ─── Paths ──────────────────────────────────────────────────────────────────
const COURSE_PROTO_PATH = path.join(__dirname, '../proto/course.proto');
const TRACKING_PROTO_PATH = path.join(__dirname, '../proto/tracking.proto');

// ─── Load Protobuf Definitions ──────────────────────────────────────────────
const courseDefinition = protoLoader.loadSync(COURSE_PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const trackingDefinition = protoLoader.loadSync(TRACKING_PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});

const courseProto = grpc.loadPackageDefinition(courseDefinition).academix;
const trackingProto = grpc.loadPackageDefinition(trackingDefinition).onlinecourse;

// ─── Create gRPC Clients ────────────────────────────────────────────────────
const courseClient = new courseProto.CourseService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const trackingClient = new trackingProto.TrackingService(
  'localhost:50052',
  grpc.credentials.createInsecure()
);

const certificationClient = new trackingProto.CertificationService(
  'localhost:50053',
  grpc.credentials.createInsecure()
);

// Helper helper to wrap callback into promise
function callRpc(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

// ─── Run Tests ──────────────────────────────────────────────────────────────
async function runDirectTests() {
  console.log('🚀 Starting direct gRPC microservice integration test...\n');

  let studentId = '311f0b48-fed8-42a9-95db-9367ba6f6b2a'; // Alice Student
  let courseId = '7ef54c90-7348-4c2e-ba95-aebcad1037ee';   // Introduction to Node.js

  // ==========================================================================
  // 1. Test MS1 - CourseService
  // ==========================================================================
  console.log('📡 Testing MS1 (CourseService) on port 50051...');
  try {
    const listRes = await callRpc(courseClient, 'ListCourses', { category: '', page: 1, limit: 2 });
    console.log('  ✅ [ListCourses] Success! Found courses:', listRes.courses.length);
    if (listRes.courses.length > 0) {
      courseId = listRes.courses[0].id;
      console.log(`     - First Course: "${listRes.courses[0].title}" (ID: ${courseId})`);
    }

    const studentRes = await callRpc(courseClient, 'GetStudent', { student_id: studentId });
    console.log('  ✅ [GetStudent] Success!');
    console.log(`     - Student Profile: ${studentRes.student.name} (${studentRes.student.email})`);
  } catch (error) {
    console.error('  ❌ MS1 Test Failed:', error.message);
  }
  console.log();

  // ==========================================================================
  // 2. Test MS2 - TrackingService
  // ==========================================================================
  console.log('📡 Testing MS2 (TrackingService) on port 50052...');
  try {
    const progressRes = await callRpc(trackingClient, 'GetProgress', {
      student_id: studentId,
      course_id: courseId
    });
    console.log('  ✅ [GetProgress] Success!');
    console.log(`     - Current Progress: ${progressRes.progress.percentage}% (Videos: ${progressRes.progress.watched_videos})`);

    const actionsRes = await callRpc(trackingClient, 'GetActions', {
      student_id: studentId,
      course_id: courseId
    });
    console.log('  ✅ [GetActions] Success! Total recorded actions:', actionsRes.actions.length);
  } catch (error) {
    console.error('  ❌ MS2 Test Failed:', error.message);
  }
  console.log();

  // ==========================================================================
  // 3. Test MS3 - CertificationService
  // ==========================================================================
  console.log('📡 Testing MS3 (CertificationService) on port 50053...');
  try {
    const certsRes = await callRpc(certificationClient, 'ListCertificates', {});
    console.log('  ✅ [ListCertificates] Success! Total issued certificates globally:', certsRes.certificates.length);
    if (certsRes.certificates.length > 0) {
      console.log(`     - Latest Certificate ID: ${certsRes.certificates[0].id} (to: ${certsRes.certificates[0].student_name})`);
    }
  } catch (error) {
    console.error('  ❌ MS3 Test Failed:', error.message);
  }
  console.log();

  console.log('🏁 gRPC integration test complete!');
}

runDirectTests().catch(console.error);
