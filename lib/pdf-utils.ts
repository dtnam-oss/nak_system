import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Add font support for Vietnamese
const addVietnameseFont = (doc: jsPDF) => {
  // Using default fonts which support basic Latin characters
  doc.setFont('helvetica');
};

export const generateSalaryPDF = (
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
): Buffer => {
  const doc = new jsPDF();
  
  addVietnameseFont(doc);
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 114, 196],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 30, right: 10, bottom: 10, left: 10 },
  });
  
  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
};

export const generateReportPDF = (
  title: string,
  data: { label: string; value: string | number }[],
  filename: string
): Buffer => {
  const doc = new jsPDF();
  
  addVietnameseFont(doc);
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Prepare rows
  const rows = data.map(item => [item.label, item.value]);
  
  // Add table
  autoTable(doc, {
    head: [['Hang muc', 'Gia tri']],
    body: rows,
    startY: 30,
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [66, 114, 196],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { top: 30, right: 10, bottom: 10, left: 10 },
  });
  
  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
};
