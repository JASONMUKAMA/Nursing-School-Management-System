import { FormEvent, useCallback, useEffect, useState } from 'react';
import { analyticsApi, dashboardApi, financeApi } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { PredictionAlerts } from '../../components/charts/DashboardCharts';
import { InvoicePaymentSummary } from '../../components/finance/InvoicePaymentSummary';
import { StudentFeeContextPanel } from '../../components/finance/StudentFeeContextPanel';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { InvoiceSearchSelect } from '../../components/ui/InvoiceSearchSelect';
import { StudentSearchSelect } from '../../components/ui/StudentSearchSelect';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { useAuth } from '../../hooks/useAuth';
import type { FinanceDashboard, Invoice, MlInsights, StudentInvoicePreview } from '../../types';
import {
  describeInvoicePayment,
  feeStatusBadgeClass,
  formatUgx,
} from '../../utils/feeDisplay';

const MIN_INVOICE_AMOUNT = 100_000;
const DEFAULT_ACADEMIC_YEAR = '2025/2026';

function defaultDueDate() {
  const due = new Date();
  due.setDate(due.getDate() + 30);
  return due.toISOString().slice(0, 10);
}

function validateInvoiceForm(form: { studentId: string; dueDate: string; amount: number }) {
  if (!form.studentId) return 'Student is required.';
  if (!form.dueDate) return 'Due date is required.';
  if (form.amount < MIN_INVOICE_AMOUNT) return `Amount must be at least UGX ${MIN_INVOICE_AMOUNT.toLocaleString()}.`;
  return '';
}

function formatUgxCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

export function FinancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'FinanceOfficer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceFormError, setInvoiceFormError] = useState('');
  const [insights, setInsights] = useState<MlInsights | null>(null);
  const [financeSummary, setFinanceSummary] = useState<FinanceDashboard | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [studentPreview, setStudentPreview] = useState<StudentInvoicePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState<Invoice | null>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '',
    academicYear: DEFAULT_ACADEMIC_YEAR,
    dueDate: defaultDueDate(),
    amount: 0,
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: 0,
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!canManage) {
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    Promise.all([
      dashboardApi.getFinance().catch(() => null),
      analyticsApi.getMlInsights().catch(() => null),
    ]).then(([finance, ml]) => {
      setFinanceSummary(finance);
      setInsights(ml);
    }).finally(() => setSummaryLoading(false));
  }, [canManage, refreshKey]);

  useEffect(() => {
    if (!showInvoiceModal) return;
    setInvoiceFormError('');
    setStudentPreview(null);
    setInvoiceForm({
      studentId: '',
      academicYear: DEFAULT_ACADEMIC_YEAR,
      dueDate: defaultDueDate(),
      amount: 0,
    });
  }, [showInvoiceModal]);

  useEffect(() => {
    if (!showPaymentModal) return;
    setSelectedPaymentInvoice(null);
    setPaymentForm({
      invoiceId: '',
      amount: 0,
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().slice(0, 10),
    });
  }, [showPaymentModal]);

  const loadStudentPreview = useCallback(async (studentId: string) => {
    if (!studentId) {
      setStudentPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const preview = await financeApi.getStudentInvoicePreview(studentId);
      setStudentPreview(preview);
      setInvoiceForm((prev) => ({
        ...prev,
        studentId,
        academicYear: preview.suggestedAcademicYear || prev.academicYear,
        amount: preview.suggestedAmount >= MIN_INVOICE_AMOUNT ? preview.suggestedAmount : prev.amount,
        dueDate: preview.nextDueDate && preview.feeStatus !== 'Paid'
          ? preview.nextDueDate
          : prev.dueDate,
      }));
    } catch {
      setStudentPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(
    (page: number, pageSize: number, search: string) =>
      financeApi.getInvoices(page, pageSize, search || undefined),
    [],
  );

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateInvoiceForm(invoiceForm);
    if (validationError) {
      setInvoiceFormError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    setInvoiceFormError('');
    try {
      await financeApi.createInvoice({
        studentId: invoiceForm.studentId,
        academicYear: invoiceForm.academicYear,
        dueDate: invoiceForm.dueDate,
        items: [{ description: 'Tuition Fee', amount: invoiceForm.amount }],
      });
      setSuccess('Invoice created.');
      setShowInvoiceModal(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to create invoice.';
      setInvoiceFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoiceId) {
      setError('Invoice is required.');
      return;
    }
    if (paymentForm.amount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await financeApi.recordPayment(paymentForm);
      setSuccess('Payment recorded.');
      setShowPaymentModal(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const applySuggestion = () => {
    if (!studentPreview) return;
    setInvoiceForm((prev) => ({
      ...prev,
      academicYear: studentPreview.suggestedAcademicYear,
      amount: studentPreview.suggestedAmount,
      dueDate: studentPreview.nextDueDate && studentPreview.feeStatus !== 'Paid'
        ? studentPreview.nextDueDate
        : prev.dueDate,
    }));
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Finance</h2>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {canManage && !summaryLoading && insights && (
        <Card title="Predictions" className="dashboard-section-card">
          <PredictionAlerts insights={insights} />
          {insights.summary && <p className="text-muted context-panel-meta">{insights.summary}</p>}
        </Card>
      )}

      {canManage && !summaryLoading && financeSummary && (
        <div className="stats-grid stats-grid-compact finance-quick-stats">
          <div className="stat-card-v2 stat-card-money">
            <div className="stat-card-v2-body">
              <span className="stat-card-v2-value">{formatUgxCompact(financeSummary.outstanding)}</span>
              <span className="stat-card-v2-label">Outstanding</span>
            </div>
          </div>
          <div className="stat-card-v2 stat-card-money">
            <div className="stat-card-v2-body">
              <span className="stat-card-v2-value">{financeSummary.overdueCount}</span>
              <span className="stat-card-v2-label">Overdue invoices</span>
            </div>
          </div>
          <div className="stat-card-v2 stat-card-money">
            <div className="stat-card-v2-body">
              <span className="stat-card-v2-value">{formatUgxCompact(financeSummary.totalCollected)}</span>
              <span className="stat-card-v2-label">Collected</span>
            </div>
          </div>
        </div>
      )}

      <Card
        title="Invoices"
        actions={
          canManage ? (
            <div className="toolbar">
              <Button size="sm" onClick={() => setShowInvoiceModal(true)}>
                New Invoice
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowPaymentModal(true)}>
                Record Payment
              </Button>
            </div>
          ) : undefined
        }
      >
        <ServerDataTable<Invoice>
          columns={[
            { key: 'invoiceNo', header: 'Invoice No', render: (i) => i.invoiceNo },
            { key: 'student', header: 'Student', render: (i) => i.studentName },
            { key: 'year', header: 'Year', render: (i) => i.academicYear },
            {
              key: 'payment',
              header: 'Paid / Due',
              render: (i) => (
                <div className="fee-status-cell">
                  <span className={`badge ${feeStatusBadgeClass(i.status)}`}>{i.status}</span>
                  <span className="text-muted fee-status-detail">{describeInvoicePayment(i)}</span>
                </div>
              ),
              print: (i) => describeInvoicePayment(i),
            },
            { key: 'total', header: 'Total', render: (i) => formatUgx(i.totalAmount) },
            { key: 'paid', header: 'Paid', render: (i) => formatUgx(i.amountPaid ?? i.totalAmount - i.balance) },
            { key: 'balance', header: 'Balance', render: (i) => formatUgx(i.balance) },
          ]}
          keyField="id"
          fetchData={fetchInvoices}
          searchPlaceholder="Search invoices or students..."
          refreshKey={refreshKey}
        />
      </Card>

      <Modal
        title="New Invoice"
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setShowInvoiceModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-invoice-form" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create invoice'}
            </Button>
          </div>
        }
      >
        <form id="new-invoice-form" className="form-grid" onSubmit={handleCreateInvoice}>
          {invoiceFormError && (
            <div className="full-width">
              <Alert type="error" message={invoiceFormError} />
            </div>
          )}
          <StudentSearchSelect
            className="full-width"
            label="Student"
            value={invoiceForm.studentId}
            onChange={(studentId) => {
              setInvoiceForm((prev) => ({ ...prev, studentId }));
              void loadStudentPreview(studentId);
            }}
            required
          />
          <div className="full-width">
            <StudentFeeContextPanel
              preview={studentPreview}
              loading={previewLoading}
              onApplySuggestion={applySuggestion}
            />
          </div>
          <Input
            className="full-width"
            label="Amount (UGX)"
            type="number"
            min={MIN_INVOICE_AMOUNT}
            step={1000}
            value={invoiceForm.amount || ''}
            onChange={(e) =>
              setInvoiceForm({
                ...invoiceForm,
                amount: e.target.value === '' ? 0 : Number(e.target.value),
              })
            }
            required
          />
          <Input
            className="full-width"
            label="Due date"
            type="date"
            min={today}
            value={invoiceForm.dueDate}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
            required
          />
          <Input
            label="Academic year"
            value={invoiceForm.academicYear}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, academicYear: e.target.value })}
            required
          />
        </form>
      </Modal>

      <Modal
        title="Record Payment"
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="record-payment-form" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save payment'}
            </Button>
          </div>
        }
      >
        <form id="record-payment-form" className="form-grid" onSubmit={handleRecordPayment}>
          <InvoiceSearchSelect
            className="full-width"
            label="Invoice"
            value={paymentForm.invoiceId}
            openBalanceOnly
            onChange={(invoiceId, invoice) => {
              setSelectedPaymentInvoice(invoice ?? null);
              setPaymentForm({
                ...paymentForm,
                invoiceId,
                amount: invoice?.balance ?? paymentForm.amount,
              });
            }}
            required
          />
          {selectedPaymentInvoice && (
            <div className="full-width">
              <InvoicePaymentSummary invoice={selectedPaymentInvoice} />
            </div>
          )}
          <Input
            label="Amount (UGX)"
            type="number"
            min={1}
            max={selectedPaymentInvoice?.balance}
            value={paymentForm.amount || ''}
            onChange={(e) =>
              setPaymentForm({
                ...paymentForm,
                amount: e.target.value === '' ? 0 : Number(e.target.value),
              })
            }
            required
          />
          <Input
            label="Payment method"
            value={paymentForm.paymentMethod}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
            required
          />
          <Input
            label="Payment date"
            type="date"
            value={paymentForm.paymentDate}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
