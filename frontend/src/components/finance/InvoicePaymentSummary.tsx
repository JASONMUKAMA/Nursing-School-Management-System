import type { Invoice } from '../../types';
import { describeInvoicePayment, feeStatusBadgeClass, formatUgx } from '../../utils/feeDisplay';

export function InvoicePaymentSummary({ invoice }: { invoice: Invoice }) {
  return (
    <div className="context-panel">
      <div className="context-panel-header">
        <strong>{invoice.invoiceNo}</strong>
        <span className={`badge ${feeStatusBadgeClass(invoice.status)}`}>{invoice.status}</span>
      </div>
      <p className="context-panel-meta">{invoice.studentName}</p>
      <p className="context-panel-summary">{describeInvoicePayment(invoice)}</p>
      <p className="context-panel-meta">
        Total {formatUgx(invoice.totalAmount)}
        {invoice.amountPaid > 0 ? ` · Paid ${formatUgx(invoice.amountPaid)}` : ''}
      </p>
    </div>
  );
}
