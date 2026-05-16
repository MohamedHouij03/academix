const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false
});

async function sendCertificateEmail(certificate) {
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'certificats@cours.local',
      to: certificate.email,
      subject: `Votre certificat - ${certificate.course_title}`,
      text: `Bonjour ${certificate.student_name}, votre certificat est en piece jointe.`,
      attachments: [
        {
          filename: `${certificate.id}.pdf`,
          path: certificate.pdf_path
        }
      ]
    });
  } catch (error) {
    console.error('Email error:', error.message);
  }
}

module.exports = {
  sendCertificateEmail
};
