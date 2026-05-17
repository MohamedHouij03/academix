const { Kafka, Partitioners } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const topic = process.env.KAFKA_TRACKING_TOPIC || 'tracking-events';
const kafkaEnabled = process.env.KAFKA_ENABLED !== 'false';

const kafka = new Kafka({
  clientId: 'ms2-tracking',
  brokers
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});
let connected = false;

async function publishTrackingEvent(event) {
  if (!kafkaEnabled) {
    console.log('Kafka disabled, tracking event not published:', event.event_type);
    return;
  }

  try {
    if (!connected) {
      await producer.connect();
      connected = true;
    }

    await producer.send({
      topic,
      messages: [
        {
          key: `${event.student_id}:${event.course_id}`,
          value: JSON.stringify(event)
        }
      ]
    });
  } catch (error) {
    console.error('Kafka producer error:', error.message);
  }
}

module.exports = {
  publishTrackingEvent
};
