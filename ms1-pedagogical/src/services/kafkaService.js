const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'ms1-pedagogical',
  brokers
});

const producer = kafka.producer();
let isConnected = false;

const connectProducer = async () => {
  if (isConnected) return;
  try {
    await producer.connect();
    isConnected = true;
    console.log('✅ MS1 Kafka Producer connecté');
  } catch (error) {
    console.error('Erreur connexion Kafka Producer:', error);
  }
};

const emitEnrollmentCreated = async (enrollment) => {
  await connectProducer();
  try {
    await producer.send({
      topic: 'enrollment-events',
      messages: [
        {
          key: enrollment.id,
          value: JSON.stringify({
            event: 'ENROLLMENT_CREATED',
            data: enrollment,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log(`📤 Event ENROLLMENT_CREATED envoyé pour ${enrollment.id}`);
  } catch (error) {
    console.error('Erreur envoi Kafka:', error);
  }
};

module.exports = {
  connectProducer,
  emitEnrollmentCreated
};
