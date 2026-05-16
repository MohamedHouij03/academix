const fs = require('fs/promises');
const path = require('path');
const { createHash, randomUUID } = require('crypto');
const { createRxDatabase } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { wrappedValidateAjvStorage } = require('rxdb/plugins/validate-ajv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ACTIONS_SNAPSHOT_FILE = path.join(DATA_DIR, 'tracking-actions.snapshot.json');

const trackingActionSchema = {
  title: 'tracking action schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'string', minLength: 1, maxLength: 100 },
    course_id: { type: 'string', minLength: 1, maxLength: 100 },
    action_type: {
      type: 'string',
      enum: ['video_watched', 'quiz_passed', 'quiz_failed', 'time_spent', 'course_completed']
    },
    resource_id: { type: 'string', maxLength: 100 },
    time_spent_seconds: { type: 'number', minimum: 0 },
    quiz_score: { type: 'number', minimum: 0, maximum: 100 },
    created_at: { type: 'string', maxLength: 40 },
    course_total_videos: { type: 'number', minimum: 0 },
    course_total_quizzes: { type: 'number', minimum: 0 }
  },
  required: [
    'id',
    'student_id',
    'course_id',
    'action_type',
    'resource_id',
    'time_spent_seconds',
    'quiz_score',
    'created_at',
    'course_total_videos',
    'course_total_quizzes'
  ],
  indexes: ['student_id', 'course_id', 'action_type']
};

async function hashFunction(input) {
  if (input instanceof ArrayBuffer) {
    input = Buffer.from(input);
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    input = Buffer.from(await input.arrayBuffer());
  }
  if (!Buffer.isBuffer(input)) {
    input = Buffer.from(String(input));
  }
  return createHash('sha256').update(input).digest('hex');
}

async function loadSnapshot(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function persistCollection(collection, filePath) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const docs = await collection.find().exec();
  const items = docs.map((doc) => doc.toJSON());
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf8');
}

async function initDatabase() {
  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageMemory()
  });

  const db = await createRxDatabase({
    name: 'online-course-tracking',
    storage,
    eventReduce: true,
    multiInstance: false,
    hashFunction
  });

  await db.addCollections({
    actions: { schema: trackingActionSchema }
  });

  const initialActions = await loadSnapshot(ACTIONS_SNAPSHOT_FILE);
  if (initialActions.length > 0) {
    await db.actions.bulkInsert(initialActions);
  }

  return {
    db,
    actions: db.actions,
    persistActions: () => persistCollection(db.actions, ACTIONS_SNAPSHOT_FILE),
    createId: () => randomUUID()
  };
}

module.exports = initDatabase();
