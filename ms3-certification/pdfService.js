const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const CERTIFICATES_DIR = path.join(__dirname, '..', 'certificates');

function generateCertificatePdf(certificate) {
  fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });

  const pdfPath = path.join(CERTIFICATES_DIR, `${certificate.id}.pdf`);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const stream = fs.createWriteStream(pdfPath);

  doc.pipe(stream);
  doc.fontSize(30).text('Certificat de reussite', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(18).text('Ce certificat est attribue a', { align: 'center' });
  doc.moveDown();
  doc.fontSize(28).text(certificate.student_name, { align: 'center' });
  doc.moveDown();
  doc.fontSize(18).text('pour avoir termine le cours', { align: 'center' });
  doc.moveDown();
  doc.fontSize(24).text(certificate.course_title, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(`Date: ${certificate.issued_at}`, { align: 'center' });
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

module.exports = {
  generateCertificatePdf
};
