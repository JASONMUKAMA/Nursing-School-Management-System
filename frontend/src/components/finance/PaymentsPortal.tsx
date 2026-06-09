import { FormEvent, useCallback, useEffect, useState } from 'react';
import { financeApi } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { InvoicePaymentSummary } from './InvoicePaymentSummary';
import {
  AirtelMoneyLogo,
  MtnMobileMoneyLogo,
  PaymentMethodLogo,
  VisaLogo,
} from './PaymentMethodLogos';
import {
  apiValueForMethod,
  PAYMENT_METHOD_AIRTEL,
  PAYMENT_METHOD_BANK,
  PAYMENT_METHOD_MTN,
  PAYMENT_METHOD_VISA,
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodChoice,
} from './paymentMethods';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { InvoiceSearchSelect } from '../ui/InvoiceSearchSelect';
import { ServerDataTable } from '../ui/ServerDataTable';
import type { GatewayTransaction, Invoice, Payment } from '../../types';
import { formatUgx } from '../../utils/feeDisplay';

type PortalMode = 'live' | 'manual';
type JpesaConfigStatus = 'loading' | 'configured' | 'not_configured' | 'error';

interface PaymentFormState {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethodChoice;
  payerPhone: string;
  transactionReference: string;
  bankReceiptNo: string;
  cardholderName: string;
  cardLastFour: string;
}

const emptyManualForm = (): PaymentFormState => ({
  invoiceId: '',
  amount: 0,
  paymentDate: new Date().toISOString().slice(0, 10),
  method: 'mtn',
  payerPhone: '',
  transactionReference: '',
  bankReceiptNo: '',
  cardholderName: '',
  cardLastFour: '',
});

function normalizeUgPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('256')) return digits;
  if (digits.startsWith('0')) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return digits;
}

function isMtnPhone(phone: string) {
  return /^256(77|78|76|39|31)\d{7}$/.test(phone);
}

function isAirtelPhone(phone: string) {
  return /^256(75|74|70|20)\d{7}$/.test(phone);
}

function validateManualForm(form: PaymentFormState) {
  if (!form.invoiceId) return 'Please select an invoice.';
  if (form.amount <= 0) return 'Enter a valid payment amount.';
  if (!form.paymentDate) return 'Payment date is required.';

  if (form.method === 'bank') {
    if (!form.bankReceiptNo.trim() && !form.transactionReference.trim())
      return 'Enter a bank receipt number or transaction reference.';
  } else if (form.method === 'mtn' || form.method === 'airtel') {
    const phone = normalizeUgPhone(form.payerPhone);
    if (form.method === 'mtn' && !isMtnPhone(phone))
      return 'Enter a valid MTN Mobile Money number.';
    if (form.method === 'airtel' && !isAirtelPhone(phone))
      return 'Enter a valid Airtel Money number.';
    if (!form.transactionReference.trim())
      return 'Transaction ID from the confirmation SMS is required.';
  } else {
    if (!form.cardholderName.trim()) return 'Cardholder name is required.';
    if (!/^\d{4}$/.test(form.cardLastFour)) return 'Enter the last 4 digits of the card.';
    if (!form.transactionReference.trim()) return 'Authorization code is required.';
  }
  return '';
}

function MethodLogo({ method, className }: { method: PaymentMethodChoice; className?: string }) {
  if (method === 'visa') return <VisaLogo className={className} />;
  if (method === 'mtn') return <MtnMobileMoneyLogo className={className} />;
  if (method === 'airtel') return <AirtelMoneyLogo className={className} />;
  return (
    <div className={`payment-bank-logo ${className ?? ''}`} aria-label="Bank transfer">
      <span>🏦</span>
      <span>Bank</span>
    </div>
  );
}

interface PaymentsPortalProps {
  onPaymentRecorded: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function PaymentsPortal({ onPaymentRecorded, onError, onSuccess }: PaymentsPortalProps) {
  const [portalMode, setPortalMode] = useState<PortalMode>('live');
  const [jpesaConfigStatus, setJpesaConfigStatus] = useState<JpesaConfigStatus>('loading');
  const [jpesaConfigError, setJpesaConfigError] = useState('');
  const [form, setForm] = useState<PaymentFormState>(emptyManualForm);
  const [livePhone, setLivePhone] = useState('');
  const [liveInvoiceId, setLiveInvoiceId] = useState('');
  const [liveAmount, setLiveAmount] = useState(0);
  const [liveInvoice, setLiveInvoice] = useState<Invoice | null>(null);
  const [pendingTx, setPendingTx] = useState<GatewayTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadJpesaConfig = useCallback(async () => {
    setJpesaConfigStatus('loading');
    setJpesaConfigError('');
    try {
      const result = await financeApi.isJpesaConfigured();
      setJpesaConfigStatus(result.configured ? 'configured' : 'not_configured');
    } catch (err) {
      setJpesaConfigStatus('error');
      setJpesaConfigError(
        err instanceof ApiClientError ? err.message : 'Could not verify JPesa configuration.',
      );
    }
  }, []);

  useEffect(() => {
    void loadJpesaConfig();
  }, [loadJpesaConfig]);

  useEffect(() => {
    if (portalMode === 'live') void loadJpesaConfig();
  }, [portalMode, loadJpesaConfig]);

  const jpesaConfigured = jpesaConfigStatus === 'configured';

  useEffect(() => {
    if (!pendingTx || pendingTx.status !== 'Pending') return undefined;
    const interval = window.setInterval(async () => {
      try {
        const updated = await financeApi.getGatewayTransaction(pendingTx.id);
        setPendingTx(updated);
        if (updated.status === 'Successful') {
          onSuccess(`Payment received. Receipt: ${updated.receiptNo ?? 'recorded'}.`);
          setPendingTx(null);
          setLiveInvoice(null);
          setLiveInvoiceId('');
          setLivePhone('');
          setLiveAmount(0);
          setRefreshKey((k) => k + 1);
          onPaymentRecorded();
        } else if (updated.status === 'Failed') {
          onError(updated.failureReason ?? 'Payment failed.');
          setPendingTx(null);
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [pendingTx, onSuccess, onError, onPaymentRecorded]);

  const fetchPayments = useCallback(
    (page: number, pageSize: number, search: string) =>
      financeApi.getPayments(page, pageSize, search || undefined),
    [],
  );

  const setField = <K extends keyof PaymentFormState>(key: K, value: PaymentFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onManualInvoiceChange = (invoiceId: string, invoice: Invoice | null) => {
    setSelectedInvoice(invoice);
    setForm((prev) => ({ ...prev, invoiceId, amount: invoice?.balance ?? 0 }));
  };

  const onLiveInvoiceChange = (invoiceId: string, invoice: Invoice | null) => {
    setLiveInvoice(invoice);
    setLiveInvoiceId(invoiceId);
    setLiveAmount(invoice?.balance ?? 0);
  };

  const handleLivePay = async (e: FormEvent) => {
    e.preventDefault();
    if (!liveInvoiceId) {
      setFormError('Please select an invoice.');
      return;
    }
    if (liveAmount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    const phone = normalizeUgPhone(livePhone);
    if (!/^256\d{9}$/.test(phone)) {
      setFormError('Enter a valid Uganda mobile number.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const result = await financeApi.initiateMobileMoney({
        invoiceId: liveInvoiceId,
        amount: liveAmount,
        phoneNumber: phone,
      });
      const tx = await financeApi.getGatewayTransaction(result.transactionId);
      setPendingTx(tx);
      onSuccess(result.message ?? 'Check your phone to approve the payment.');
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : 'Could not initiate payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateManualForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (selectedInvoice && form.amount > selectedInvoice.balance) {
      setFormError(`Amount cannot exceed balance of ${formatUgx(selectedInvoice.balance)}.`);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const isMobile = form.method === 'airtel' || form.method === 'mtn';
      const isBank = form.method === 'bank';
      const payment = await financeApi.recordPayment({
        invoiceId: form.invoiceId,
        amount: form.amount,
        paymentMethod: apiValueForMethod(form.method),
        paymentDate: form.paymentDate,
        payerPhone: isMobile ? normalizeUgPhone(form.payerPhone) : undefined,
        transactionReference: isBank
          ? form.transactionReference.trim() || undefined
          : isMobile
            ? form.transactionReference.trim()
            : `${form.transactionReference.trim()} (${form.cardholderName.trim()})`,
        cardLastFour: form.method === 'visa' ? form.cardLastFour : undefined,
        bankReceiptNo: isBank ? form.bankReceiptNo.trim() || undefined : undefined,
      });
      onSuccess(`Payment recorded. Receipt: ${payment.receiptNo}`);
      setForm(emptyManualForm());
      setSelectedInvoice(null);
      setRefreshKey((k) => k + 1);
      onPaymentRecorded();
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : 'Payment could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  const summaryInvoice = portalMode === 'live' ? liveInvoice : selectedInvoice;
  const summaryAmount = portalMode === 'live' ? liveAmount : form.amount;
  const mobileMoney = form.method === 'airtel' || form.method === 'mtn';
  const methodLabel =
    form.method === 'visa'
      ? 'Card details'
      : form.method === 'bank'
        ? 'Bank transfer details'
        : form.method === 'mtn'
          ? 'MTN Mobile Money details'
          : 'Airtel Money details';

  return (
    <div className="payments-portal">
      <div className="payment-portal-mode-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`tab${portalMode === 'live' ? ' active' : ''}`}
          aria-selected={portalMode === 'live'}
          onClick={() => { setPortalMode('live'); setFormError(''); }}
        >
          Pay now (Mobile Money)
        </button>
        <button
          type="button"
          role="tab"
          className={`tab${portalMode === 'manual' ? ' active' : ''}`}
          aria-selected={portalMode === 'manual'}
          onClick={() => { setPortalMode('manual'); setFormError(''); }}
        >
          Record previous payment
        </button>
      </div>

      <div className="payment-form-layout">
        <Card title={portalMode === 'live' ? 'Pay with JPesa' : 'Record payment'} className="payment-form-card">
          {formError && (
            <div className="payment-form-alert">
              <Alert type="error" message={formError} onClose={() => setFormError('')} />
            </div>
          )}

          {portalMode === 'live' ? (
            <form className="payment-form" onSubmit={handleLivePay} noValidate>
              {jpesaConfigStatus === 'not_configured' && (
                <Alert
                  type="error"
                  message="JPesa API is not configured on the server. Use Record previous payment, or set Jpesa__ApiKey and Jpesa__CallbackUrl in .env and restart the API container."
                />
              )}
              {jpesaConfigStatus === 'error' && (
                <Alert
                  type="error"
                  message={`Could not verify JPesa setup: ${jpesaConfigError} Hard-refresh the page or log in again as Admin/Finance Officer.`}
                />
              )}
              {pendingTx && (
                <Alert
                  type="success"
                  message={`Waiting for approval… Ref: ${pendingTx.externalTransactionId}. Status: ${pendingTx.status}`}
                />
              )}
              <fieldset className="payment-form-section">
                <legend>Invoice & amount</legend>
                <InvoiceSearchSelect
                  className="full-width"
                  label="Invoice"
                  value={liveInvoiceId}
                  openBalanceOnly
                  onChange={onLiveInvoiceChange}
                  required
                />
                <div className="payment-form-row">
                  <Input
                    label="Amount (UGX)"
                    type="number"
                    min={1}
                    max={liveInvoice?.balance}
                    value={liveAmount || ''}
                    onChange={(e) => setLiveAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Mobile number (MTN / Airtel)"
                    type="tel"
                    placeholder="0772 123 456"
                    value={livePhone}
                    onChange={(e) => setLivePhone(e.target.value)}
                    required
                    disabled={!!pendingTx}
                  />
                </div>
                <p className="payment-form-hint">
                  A JPesa prompt is sent to this number. Works with MTN Mobile Money and Airtel Money.
                </p>
              </fieldset>
              <div className="payment-form-footer">
                <Button
                  type="submit"
                  disabled={submitting || !liveInvoiceId || !jpesaConfigured || !!pendingTx}
                  className="payment-submit-btn"
                >
                  {submitting ? 'Sending request…' : `Pay ${liveAmount > 0 ? formatUgx(liveAmount) : ''}`.trim()}
                </Button>
              </div>
            </form>
          ) : (
            <form className="payment-form" onSubmit={handleManualSubmit} noValidate>
              <fieldset className="payment-form-section">
                <legend>Invoice details</legend>
                <InvoiceSearchSelect
                  className="full-width"
                  label="Invoice"
                  value={form.invoiceId}
                  openBalanceOnly
                  onChange={onManualInvoiceChange}
                  required
                />
                <div className="payment-form-row">
                  <Input
                    label="Amount (UGX)"
                    type="number"
                    min={1}
                    max={selectedInvoice?.balance}
                    value={form.amount || ''}
                    onChange={(e) => setField('amount', e.target.value === '' ? 0 : Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Payment date"
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => setField('paymentDate', e.target.value)}
                    required
                  />
                </div>
              </fieldset>

              <fieldset className="payment-form-section">
                <legend>Payment method</legend>
                <div className="payment-method-options payment-method-options-4" role="radiogroup">
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`payment-method-option payment-method-option-${option.id}${
                        form.method === option.id ? ' selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.id}
                        checked={form.method === option.id}
                        onChange={() => setField('method', option.id)}
                      />
                      <MethodLogo method={option.id} className="payment-method-logo" />
                      <span className="payment-method-label">
                        <span className="payment-method-name">{option.name}</span>
                        <span className="payment-method-desc">{option.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="payment-form-section">
                <legend className="payment-section-legend-with-logo">
                  <MethodLogo method={form.method} className="payment-section-logo" />
                  <span>{methodLabel}</span>
                </legend>

                {form.method === 'bank' ? (
                  <>
                    <Input
                      className="full-width"
                      label="Bank receipt / slip number"
                      placeholder="e.g. BR-2026-001234"
                      value={form.bankReceiptNo}
                      onChange={(e) => setField('bankReceiptNo', e.target.value)}
                    />
                    <Input
                      className="full-width"
                      label="Transaction reference (optional)"
                      placeholder="Bank transaction ID"
                      value={form.transactionReference}
                      onChange={(e) => setField('transactionReference', e.target.value)}
                    />
                  </>
                ) : mobileMoney ? (
                  <>
                    <Input
                      className="full-width"
                      label="Mobile number"
                      type="tel"
                      value={form.payerPhone}
                      onChange={(e) => setField('payerPhone', e.target.value)}
                      required
                    />
                    <Input
                      className="full-width"
                      label="Transaction ID"
                      placeholder="From confirmation SMS"
                      value={form.transactionReference}
                      onChange={(e) => setField('transactionReference', e.target.value)}
                      required
                    />
                  </>
                ) : (
                  <>
                    <Input
                      className="full-width"
                      label="Name on card"
                      value={form.cardholderName}
                      onChange={(e) => setField('cardholderName', e.target.value)}
                      required
                    />
                    <div className="payment-form-row">
                      <Input
                        label="Card last 4 digits"
                        value={form.cardLastFour ? `•••• ${form.cardLastFour}` : ''}
                        onChange={(e) =>
                          setField('cardLastFour', e.target.value.replace(/\D/g, '').slice(-4))
                        }
                        required
                      />
                      <Input
                        label="Authorization code"
                        value={form.transactionReference}
                        onChange={(e) => setField('transactionReference', e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
                <p className="payment-form-hint">
                  For payments already made outside the system — enter the receipt or transaction ID from the SMS or bank slip.
                </p>
              </fieldset>

              <div className="payment-form-footer">
                <Button type="submit" disabled={submitting || !form.invoiceId} className="payment-submit-btn">
                  {submitting ? 'Saving…' : 'Record payment'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <aside className="payment-summary-panel">
          <Card title="Order summary">
            {summaryInvoice ? (
              <>
                <InvoicePaymentSummary invoice={summaryInvoice} />
                <dl className="payment-summary-totals">
                  <div className="payment-summary-row payment-summary-row-total">
                    <dt>Balance due</dt>
                    <dd>{formatUgx(summaryInvoice.balance)}</dd>
                  </div>
                  <div className="payment-summary-row payment-summary-row-pay">
                    <dt>This payment</dt>
                    <dd>{summaryAmount > 0 ? formatUgx(summaryAmount) : '—'}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-muted payment-summary-empty">Select an invoice to view the balance.</p>
            )}
          </Card>
        </aside>
      </div>

      <Card title="Payment history">
        <ServerDataTable<Payment>
          columns={[
            { key: 'receipt', header: 'Receipt', render: (p) => p.receiptNo },
            { key: 'date', header: 'Date', render: (p) => p.paymentDate },
            { key: 'student', header: 'Student', render: (p) => p.studentName },
            { key: 'source', header: 'Source', render: (p) => p.paymentSource },
            {
              key: 'method',
              header: 'Method',
              render: (p) => (
                <span className="payment-history-method">
                  {[PAYMENT_METHOD_AIRTEL, PAYMENT_METHOD_MTN, PAYMENT_METHOD_VISA].includes(p.paymentMethod) ? (
                    <PaymentMethodLogo method={p.paymentMethod} className="payment-history-logo" />
                  ) : (
                    <span>{p.paymentMethod}</span>
                  )}
                </span>
              ),
            },
            { key: 'amount', header: 'Amount', render: (p) => formatUgx(p.amount) },
            {
              key: 'ref',
              header: 'Reference / Receipt',
              render: (p) => p.transactionReference ?? p.bankReceiptNo ?? p.providerReference ?? '—',
            },
          ]}
          keyField="id"
          fetchData={fetchPayments}
          searchPlaceholder="Search receipt, student, or reference..."
          refreshKey={refreshKey}
        />
      </Card>
    </div>
  );
}

export { PAYMENT_METHOD_AIRTEL, PAYMENT_METHOD_MTN, PAYMENT_METHOD_VISA, PAYMENT_METHOD_BANK } from './paymentMethods';
