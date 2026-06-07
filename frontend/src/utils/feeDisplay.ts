export function formatUgx(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function feeStatusBadgeClass(status: string) {
  const key = status.toLowerCase();
  if (key === 'paid') return 'badge-paid';
  if (key === 'overdue') return 'badge-overdue';
  if (key === 'partial') return 'badge-partial';
  if (key === 'due' || key === 'unpaid') return 'badge-unpaid';
  return 'badge-pending';
}

export function describeInvoicePayment(invoice: {
  status: string;
  balance: number;
  amountPaid?: number;
  totalAmount: number;
  dueDate: string | null;
  lastPaymentDate: string | null;
}) {
  if (invoice.status === 'Paid' || invoice.balance <= 0) {
    return invoice.lastPaymentDate
      ? `Paid on ${formatDate(invoice.lastPaymentDate)}`
      : 'Paid in full';
  }
  const duePart = invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : 'Payment due';
  return `${duePart} · ${formatUgx(invoice.balance)} outstanding`;
}

export function describeStudentFeeStatus(row: {
  feeStatus: string;
  balance: number;
  nextDueDate?: string | null;
  lastPaymentDate?: string | null;
}) {
  if (row.feeStatus === 'Paid' || row.balance <= 0) {
    return row.lastPaymentDate
      ? `Paid · last payment ${formatDate(row.lastPaymentDate)}`
      : 'Paid in full';
  }
  if (row.feeStatus === 'Overdue') {
    return row.nextDueDate
      ? `Overdue since ${formatDate(row.nextDueDate)} · ${formatUgx(row.balance)}`
      : `Overdue · ${formatUgx(row.balance)}`;
  }
  return row.nextDueDate
    ? `Due ${formatDate(row.nextDueDate)} · ${formatUgx(row.balance)}`
    : `${formatUgx(row.balance)} due`;
}
