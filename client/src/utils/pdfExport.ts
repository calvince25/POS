import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export const exportToPDF = (
  title: string,
  headers: string[],
  data: any[][],
  filename: string
) => {
  const doc = new jsPDF();

  // Header Title
  doc.setFontSize(20);
  doc.setTextColor(34, 113, 177); // primary blue
  doc.text('RestoPOS', 14, 22);

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(29, 35, 39); // dark text
  doc.text(title, 14, 32);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 105, 112); // muted text
  doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 40);

  // Table
  (doc as any).autoTable({
    startY: 45,
    head: [headers],
    body: data,
    theme: 'striped',
    headStyles: { fillColor: [34, 113, 177] },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  doc.save(`${filename}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
