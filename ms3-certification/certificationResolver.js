const { randomUUID } = require('crypto');
const db = require('./db');
const { generateCertificatePdf } = require('./pdfService');
const { sendCertificateEmail } = require('./emailService');

async function getCertificate(student_id, course_id) {
  const certificate = await db.get(
    'SELECT * FROM certificates WHERE student_id = ? AND course_id = ?',
    [student_id, course_id]
  );

  return certificate || null;
}

async function listCertificates() {
  return db.all('SELECT * FROM certificates ORDER BY issued_at DESC');
}

async function issueCertificate(payload) {
  if (Number(payload.progress_percentage) < 100) {
    throw new Error('Le cours n est pas encore termine');
  }

  const existing = await getCertificate(payload.student_id, payload.course_id);
  if (existing) {
    return {
      certificate: existing,
      message: 'Certificat deja genere'
    };
  }

  const certificate = {
    id: randomUUID(),
    student_id: payload.student_id,
    course_id: payload.course_id,
    student_name: payload.student_name || payload.student_id,
    course_title: payload.course_title || payload.course_id,
    pdf_path: '',
    email: payload.student_email,
    issued_at: new Date().toISOString()
  };

  certificate.pdf_path = await generateCertificatePdf(certificate);

  await db.run(
    `INSERT INTO certificates
     (id, student_id, course_id, student_name, course_title, pdf_path, email, issued_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      certificate.id,
      certificate.student_id,
      certificate.course_id,
      certificate.student_name,
      certificate.course_title,
      certificate.pdf_path,
      certificate.email,
      certificate.issued_at
    ]
  );

  await sendCertificateEmail(certificate);

  return {
    certificate,
    message: 'Certificat genere et email envoye'
  };
}

module.exports = {
  issueCertificate,
  getCertificate,
  listCertificates
};
