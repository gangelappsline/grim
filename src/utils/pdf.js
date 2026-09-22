import jsPDF from 'jspdf';
import {
  formatCurrency,
  formatDateNumeric,
  FREQUENCY_LABELS,
  LOAN_STATUS_LABELS,
  SCHEDULE_STATUS_LABELS,
} from './format';

// ============================================================
// PDF completo del préstamo (A4) — función yX
// ============================================================

export function generateLoanPdf(loan) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let y = 0;

  // ─── Header ───
  doc.setFillColor(14, 18, 24);
  doc.rect(0, 0, 210, 26, 'F');
  y = 11;

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 177, 60);
  doc.text('GRIM', 14, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(173, 166, 146);
  doc.text('Gestión de Préstamos', 29, y - 0.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 220, 220);
  doc.text(`Préstamo #${loan.id}`, 196, y, { align: 'right' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(173, 166, 146);
  doc.text(LOAN_STATUS_LABELS[loan.status] ?? loan.status, 196, y + 5, {
    align: 'right',
  });

  y = 36;

  // ─── Sección ───
  function section(title) {
    doc.setDrawColor(212, 177, 60);
    doc.setLineWidth(0.4);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 125, 50);
    doc.text(title, 14, y);
    y += 6;
  }

  function field(label, value, x = 14, width = 91) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 110, 110);
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(value, x + width * 0.42, y);
  }

  // ─── Cliente ───
  section('INFORMACIÓN DEL CLIENTE');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(loan.client.full_name, 14, y);
  y += 6;

  field('DNI', loan.client.dni, 14, 91);
  if (loan.client.phone) field('Teléfono', loan.client.phone, 105, 91);
  y += 5;

  if (loan.client.email) {
    field('Email', loan.client.email, 14, 182);
    y += 5;
  }
  if (loan.client.address) {
    field('Dirección', loan.client.address, 14, 182);
    y += 5;
  }
  y += 3;

  // ─── Detalle ───
  section('DETALLE DEL PRÉSTAMO');
  field('Monto desembolsado', formatCurrency(loan.amount), 14, 91);
  field('Estado', LOAN_STATUS_LABELS[loan.status] ?? loan.status, 105, 91);
  y += 5;
  field('Tasa de interés', `${loan.interest_rate}%`, 14, 91);
  field('Frecuencia', FREQUENCY_LABELS[loan.frequency] ?? loan.frequency, 105, 91);
  y += 5;
  field('Número de cuotas', String(loan.term), 14, 91);
  field('Cuota', formatCurrency(loan.installment_amount), 105, 91);
  y += 5;
  field('Fecha desembolso', formatDateNumeric(loan.disbursement_date), 14, 91);
  field('Fecha vencimiento', formatDateNumeric(loan.due_date), 105, 91);
  y += 5;
  field('Total a pagar', formatCurrency(loan.total_amount), 14, 91);
  y += 5;
  y += 3;

  // ─── Estado de cuenta ───
  section('ESTADO DE CUENTA');
  const paidCount = loan.payment_schedules.filter((s) => s.status === 'paid').length;
  const progress =
    loan.total_amount > 0
      ? Math.min(100, (loan.total_paid / loan.total_amount) * 100)
      : 0;

  field('Total cobrado', formatCurrency(loan.total_paid), 14, 91);
  field('Cuotas pagadas', `${paidCount} / ${loan.term}`, 105, 91);
  y += 5;
  field('Saldo pendiente', formatCurrency(loan.remaining_balance), 14, 91);
  field('Avance', `${progress.toFixed(1)}%`, 105, 91);
  y += 5;

  // Barra de progreso
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(14, y, 182, 3, 1, 1, 'F');
  if (progress > 0) {
    doc.setFillColor(212, 177, 60);
    doc.roundedRect(14, y, Math.max(2, (progress / 100) * 182), 3, 1, 1, 'F');
  }
  y += 8;

  if (loan.notes) {
    field('Notas', loan.notes, 14, 182);
    y += 5;
  }
  y += 3;

  // ─── Tabla de cuotas ───
  section('TABLA DE CUOTAS');

  const cols = {
    num: 14,
    date: 26,
    due: 64,
    paid: 102,
    bal: 140,
    status: 172,
  };

  doc.setFillColor(235, 235, 235);
  doc.rect(14, y - 4, 182, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('#', cols.num, y);
  doc.text('Vencimiento', cols.date, y);
  doc.text('Por cobrar', cols.due, y);
  doc.text('Pagado', cols.paid, y);
  doc.text('Saldo', cols.bal, y);
  doc.text('Estado', cols.status, y);
  y += 5;

  loan.payment_schedules.forEach((s, i) => {
    if (y > 272) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, y - 3.5, 182, 6, 'F');
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(String(s.installment_number), cols.num, y);
    doc.text(formatDateNumeric(s.due_date), cols.date, y);
    doc.text(formatCurrency(s.amount_due), cols.due, y);
    doc.text(formatCurrency(s.amount_paid), cols.paid, y);
    doc.text(formatCurrency(s.balance), cols.bal, y);

    if (s.status === 'paid') doc.setTextColor(22, 163, 74);
    else if (s.status === 'overdue') doc.setTextColor(220, 38, 38);
    else doc.setTextColor(100, 100, 100);

    doc.text(SCHEDULE_STATUS_LABELS[s.status] ?? s.status, cols.status, y);
    y += 6;
  });

  // ─── Footer en todas las páginas ───
  const totalPages = doc.getNumberOfPages();
  const today = new Date().toLocaleDateString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text(`Generado el ${today}`, 14, 290);
    doc.text(`Página ${p} de ${totalPages}`, 196, 290, { align: 'right' });
  }

  const filename = `prestamo-${loan.id}-${loan.client.full_name.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}

// ============================================================
// Ticket de pago (80x120mm) — función bX
// ============================================================

export function generatePaymentTicket({
  id,
  loanId,
  installmentNumber,
  clientName,
  amount,
  paymentMethod,
  paymentDate,
  notes,
}) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 120] });
  let y = 0;

  // ─── Header ───
  doc.setFillColor(14, 18, 24);
  doc.rect(0, 0, 80, 16, 'F');
  y = 6.5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 177, 60);
  doc.text('GRIM', 6, y);

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(173, 166, 146);
  doc.text('Gestión de Préstamos', 19, y - 0.3);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 220, 220);
  doc.text('RECIBO DE PAGO', 74, y - 1, { align: 'right' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(173, 166, 146);
  doc.text(`No. ${id}`, 74, y + 4, { align: 'right' });

  y = 22;

  function row(label, value, bold = false) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(130, 120, 100);
    doc.text(label, 6, y);

    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(20, 20, 20);
    const truncated = doc.splitTextToSize(value, 46)[0];
    doc.text(truncated, 74, y, { align: 'right' });
    y += 5.5;
  }

  row('Cliente', clientName);
  row('Préstamo', `#${loanId}`);
  row('Cuota', `#${installmentNumber}`);
  y += 1;

  // Línea
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.25);
  doc.line(6, y, 74, y);
  y += 4;

  // Monto destacado
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(130, 120, 100);
  doc.text('Monto pagado', 6, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 150, 70);
  doc.text(formatCurrency(amount), 74, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.25);
  doc.line(6, y, 74, y);
  y += 4;

  row('Método', paymentMethod);
  row('Fecha', formatDateNumeric(paymentDate.slice(0, 10)));

  if (notes) {
    y += 1;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(6, y, 74, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(130, 120, 100);
    doc.text('Notas:', 6, y);
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(notes, 68);
    doc.text(lines, 6, y);
    y += lines.length * 3.5;
  }

  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(6, y, 74, y);
  y += 4;

  // Footer
  const today = new Date().toLocaleDateString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 170, 170);
  doc.text(`Generado el ${today}`, 80 / 2, y, { align: 'center' });

  doc.save(`ticket-pago-${id}.pdf`);
}