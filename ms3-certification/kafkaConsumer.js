const { Kafka } = require('kafkajs');
const certificationResolver = require('./certificationResolver');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const topic = process.env.KAFKA_TRACKING_TOPIC || 'tracking-events';

const kafka = new Kafka({
  clientId: 'ms3-certification',
  brokers
});

const consumer = kafka.consumer({ groupId: 'certification-service' });

async function startKafkaConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const event = JSON.parse(message.value.toString());

        if (event.event_type !== 'course.completed') {
          return;
        }

        await certificationResolver.issueCertificate({
          student_id: event.student_id,
          course_id: event.course_id,
          student_name: event.student_name || event.student_id,
          student_email: event.student_email || process.env.DEFAULT_STUDENT_EMAIL || 'student@example.com',
          course_title: event.course_title || event.course_id,
          progress_percentage: event.progress_percentage
        });
      }
    });
  } catch (error) {
    console.error('Kafka consumer error:', error.message);
  }
}

module.exports = {
  startKafkaConsumer
};
