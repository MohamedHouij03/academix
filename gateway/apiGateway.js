const path = require('path');
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const resolvers = require('./resolvers');
const courseRoutes = require('./rest-routes/courseRoutes');
const userRoutes = require('./rest-routes/userRoutes');
const enrollmentRoutes = require('./rest-routes/enrollmentRoutes');
const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.gql'), 'utf8');
const protoPath = path.join(__dirname, '..', 'proto', 'tracking.proto');
const protoDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const onlineCourseProto = grpc.loadPackageDefinition(protoDefinition).onlinecourse;
const app = express();

app.use(cors());
app.use(express.json());

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

function callGrpc(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway - Plateforme de cours en ligne',
    graphql: 'POST /graphql',
    rest: {
      cours: 'GET /api/cours, GET /api/cours/:id',
      users: 'POST /api/users',
      inscriptions: 'POST /api/inscriptions',
      recordAction: 'POST /tracking/actions',
      progress: 'GET /tracking/progress/:student_id/:course_id',
      actions: 'GET /tracking/actions/:student_id/:course_id'
    },
    services: {
      ms1: process.env.COURSE_GRPC_URL || 'localhost:50051',
      ms2: process.env.TRACKING_GRPC_URL || 'localhost:50052',
      ms3: process.env.CERTIFICATION_GRPC_URL || 'localhost:50053'
    }
  });
});
app.post('/tracking/actions', async (req, res) => {
  try {
    const response = await callGrpc(createTrackingClient(), 'RecordAction', req.body);
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({
      error: error.details || error.message
    });
  }
});

app.get('/tracking/progress/:student_id/:course_id', async (req, res) => {
  try {
    const response = await callGrpc(createTrackingClient(), 'GetProgress', {
      student_id: req.params.student_id,
      course_id: req.params.course_id
    });
    res.json(response.progress);
  } catch (error) {
    res.status(500).json({
      error: error.details || error.message
    });
  }
});

app.get('/tracking/actions/:student_id/:course_id', async (req, res) => {
  try {
    const response = await callGrpc(createTrackingClient(), 'GetActions', {
      student_id: req.params.student_id,
      course_id: req.params.course_id
    });
    res.json(response.actions);
  } catch (error) {
    res.status(500).json({
      error: error.details || error.message
    });
  }
});

app.use('/api/cours', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inscriptions', enrollmentRoutes);

app.put('/tracking/actions/:id', async (req, res) => {
  try {
    const response = await callGrpc(createTrackingClient(), 'UpdateAction', {
      id: req.params.id,
      ...req.body
    });
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.details || error.message });
  }
});

app.delete('/tracking/actions/:id', async (req, res) => {
  try {
    const response = await callGrpc(createTrackingClient(), 'DeleteAction', {
      id: req.params.id
    });
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.details || error.message });
  }
});

app.put('/api/certificates', async (req, res) => {
  try {
    const response = await callGrpc(createCertificationClient(), 'UpdateCertificate', req.body);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.details || error.message });
  }
});

app.delete('/api/certificates', async (req, res) => {
  try {
    const response = await callGrpc(createCertificationClient(), 'DeleteCertificate', req.body);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.details || error.message });
  }
});

const server = new ApolloServer({
  typeDefs,
  resolvers
});

async function startServer() {
  await server.start();
  app.use('/graphql', expressMiddleware(server));

  const port = process.env.GATEWAY_PORT || 3000;
  app.listen(port, () => {
    console.log(`API Gateway en cours d'execution sur http://localhost:${port}`);
  });
}

startServer();
