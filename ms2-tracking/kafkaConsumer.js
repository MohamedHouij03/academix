/**
 * MS2 Tracking — Kafka consumer for `enrollment-events`
 *
 * Listens to events published by MS1 when a student enrolls in a course.
 * On ENROLLMENT_CREATED, we record an initial sentinel action so MS2 has
 * an immediate progress record (0%) for that student/course pair, which
 * enables GetProgress calls to return a meaningful response before any
 * tracking actions are explicitly submitted.
 */

const { Kafka } = require('kafkajs');
const trackingResolver = require('./trackingResolver');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const topic = process.env.KAFKA_ENROLLMENT_TOPIC || 'enrollment-events';

const kafka = new Kafka({
  clientId: 'ms2-tracking',
  brokers
});

const consumer = kafka.consumer({ groupId: 'tracking-service-enrollments' });

async function startEnrollmentConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    console.log(`📡 MS2 Tracking: consuming [${topic}]`);

    await consumer.run({
      eachMessage: async ({ message }) => {
        let event;
        try {
          event = JSON.parse(message.value.toString());
        } catch (parseErr) {
          console.error('❌ enrollment-events: invalid JSON:', message.value.toString());
          return;
        }

        const { event: eventType, data } = event;

        if (eventType !== 'ENROLLMENT_CREATED') {
          // Silently ignore unknown event types
          return;
        }

        const { user_id, course_id, id: enrollment_id } = data || {};

        if (!user_id || !course_id) {
          console.warn('⚠️  enrollment-events: missing user_id or course_id, skipping', event);
          return;
        }

        console.log(`📥 enrollment-events: ENROLLMENT_CREATED user=${user_id} course=${course_id}`);

        try {
          // Record an initialisation action (time_spent=0, no resources yet).
          // This seeds the progress record so GetProgress works from day one.
          await trackingResolver.recordAction({
            student_id: user_id,
            course_id,
            action_type: 'time_spent',
            resource_id: `enrollment:${enrollment_id || 'unknown'}`,
            time_spent_seconds: 0,
            quiz_score: 0,
            course_total_videos: 0,
            course_total_quizzes: 0
          });

          console.log(`✅ Progress record seeded for user=${user_id} course=${course_id}`);
        } catch (err) {
          console.error(`❌ Failed to seed progress for user=${user_id} course=${course_id}:`, err.message);
        }
      }
    });
  } catch (err) {
    console.error('❌ MS2 Tracking Kafka consumer error:', err.message);
  }
}

async function stopEnrollmentConsumer() {
  try {
    await consumer.disconnect();
    console.log('🔌 MS2 enrollment-events consumer disconnected');
  } catch (err) {
    console.error('❌ Error disconnecting enrollment consumer:', err.message);
  }
}

module.exports = { startEnrollmentConsumer, stopEnrollmentConsumer };
