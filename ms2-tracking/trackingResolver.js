const dbPromise = require('./db');
const { publishTrackingEvent } = require('./kafkaProducer');

function toJson(doc) {
  return doc ? doc.toJSON() : null;
}

function uniqueCount(actions, type) {
  return new Set(
    actions
      .filter((action) => action.action_type === type)
      .map((action) => action.resource_id)
  ).size;
}

function latestTotal(actions, fieldName) {
  const values = actions
    .map((action) => action[fieldName])
    .filter((value) => Number(value) > 0);
  return values.length > 0 ? values[values.length - 1] : 0;
}

async function getActionsByStudentAndCourse(student_id, course_id) {
  const { actions } = await dbPromise;
  const docs = await actions.find({
    selector: {
      student_id,
      course_id
    }
  }).exec();

  return docs.map((doc) => doc.toJSON());
}

async function calculateProgress(student_id, course_id) {
  const actions = await getActionsByStudentAndCourse(student_id, course_id);
  const total_videos = latestTotal(actions, 'course_total_videos');
  const total_quizzes = latestTotal(actions, 'course_total_quizzes');
  const watched_videos = uniqueCount(actions, 'video_watched');
  const passed_quizzes = uniqueCount(actions, 'quiz_passed');
  const time_spent_seconds = actions.reduce((sum, action) => sum + Number(action.time_spent_seconds || 0), 0);
  const totalItems = total_videos + total_quizzes;
  const completedItems = Math.min(watched_videos, total_videos) + Math.min(passed_quizzes, total_quizzes);
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const hasCompletionEvent = actions.some((action) => action.action_type === 'course_completed');

  return {
    student_id,
    course_id,
    watched_videos,
    passed_quizzes,
    total_videos,
    total_quizzes,
    time_spent_seconds,
    percentage,
    completed: hasCompletionEvent || percentage >= 100
  };
}

async function recordAction(payload) {
  const { actions, persistActions, createId } = await dbPromise;
  const inserted = await actions.insert({
    id: createId(),
    student_id: payload.student_id,
    course_id: payload.course_id,
    action_type: payload.action_type,
    resource_id: payload.resource_id || '',
    time_spent_seconds: payload.time_spent_seconds || 0,
    quiz_score: payload.quiz_score || 0,
    course_total_videos: payload.course_total_videos || 0,
    course_total_quizzes: payload.course_total_quizzes || 0,
    created_at: new Date().toISOString()
  });

  await persistActions();

  const action = inserted.toJSON();
  const progress = await calculateProgress(action.student_id, action.course_id);
  const event = {
    event_id: createId(),
    event_type: progress.completed ? 'course.completed' : 'progress.updated',
    student_id: action.student_id,
    course_id: action.course_id,
    progress_percentage: progress.percentage,
    completed: progress.completed,
    created_at: new Date().toISOString()
  };

  await publishTrackingEvent(event);

  return {
    action,
    progress
  };
}

async function getActionById(id) {
  const { actions } = await dbPromise;
  const doc = await actions.findOne(id).exec();
  return toJson(doc);
}

async function updateAction(id, payload) {
  const { actions, persistActions } = await dbPromise;
  const doc = await actions.findOne(id).exec();
  if (!doc) throw new Error('Action not found');

  await doc.atomicUpdate((oldData) => ({
    student_id: payload.student_id || oldData.student_id,
    course_id: payload.course_id || oldData.course_id,
    action_type: payload.action_type || oldData.action_type,
    resource_id: payload.resource_id !== undefined ? payload.resource_id : oldData.resource_id,
    time_spent_seconds: payload.time_spent_seconds !== undefined ? payload.time_spent_seconds : oldData.time_spent_seconds,
    quiz_score: payload.quiz_score !== undefined ? payload.quiz_score : oldData.quiz_score,
    course_total_videos: payload.course_total_videos !== undefined ? payload.course_total_videos : oldData.course_total_videos,
    course_total_quizzes: payload.course_total_quizzes !== undefined ? payload.course_total_quizzes : oldData.course_total_quizzes
  }));

  await persistActions();
  return doc.toJSON();
}

async function deleteAction(id) {
  const { actions, persistActions } = await dbPromise;
  const doc = await actions.findOne(id).exec();
  if (!doc) throw new Error('Action not found');

  await doc.remove();
  await persistActions();
  return { success: true, message: 'Action deleted' };
}

module.exports = {
  recordAction,
  calculateProgress,
  getActionsByStudentAndCourse,
  getActionById,
  updateAction,
  deleteAction
};
