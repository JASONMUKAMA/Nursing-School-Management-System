import { FormEvent, useCallback, useEffect, useState } from 'react';
import { publicFinanceApi } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import type { GatewayTransaction, PublicStudentFeeSummary } from '../../types';
import { feeStatusBadgeClass, formatUgx } from '../../utils/feeDisplay';

function normalizeUgPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('256')) return digits;
  if (digits.startsWith('0')) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return digits;
}

export function PublicPaySection() {
  const [studentNo, setStudentNo] = useState('');
  const [lookupNo, setLookupNo] = useState('');
  const [fees, setFees] = useState<PublicStudentFeeSummary | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [jpesaConfigured, setJpesaConfigured] = useState(false);
  const [jpesaCheckDone, setJpesaCheckDone] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState(0);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [pendingTx, setPendingTx] = useState<GatewayTransaction | null>(null);

  useEffect(() => {
    publicFinanceApi
      .isJpesaConfigured()
      .then((r) => setJpesaConfigured(r.configured))
      .catch(() => setJpesaConfigured(false))
      .finally(() => setJpesaCheckDone(true));
  }, []);

  useEffect(() => {
    if (!pendingTx || pendingTx.status !== 'Pending') return undefined;
    const interval = window.setInterval(async () => {
      try {
        const updated = await publicFinanceApi.getGatewayTransaction(pendingTx.id, lookupNo);
        setPendingTx(updated);
        if (updated.status === 'Successful') {
          setPaySuccess(`Payment received. Receipt: ${updated.receiptNo ?? 'recorded'}. Thank you!`);
          setPendingTx(null);
          void refreshFees(lookupNo);
        } else if (updated.status === 'Failed') {
          setPayError(updated.failureReason ?? 'Payment was not completed.');
          setPendingTx(null);
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [pendingTx, lookupNo]);

  const refreshFees = useCallback(async (no: string) => {
    const summary = await publicFinanceApi.getStudentFees(no);
    setFees(summary);
    const firstOpen = summary.openInvoices[0];
    if (firstOpen) {
      setSelectedInvoiceId(firstOpen.id);
      setAmount(firstOpen.balance);
    } else {
      setSelectedInvoiceId('');
      setAmount(0);
    }
  }, []);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = studentNo.trim();
    if (!trimmed) {
      setLookupError('Enter your student number.');
      return;
    }

    setLookupLoading(true);
    setLookupError('');
    setPayError('');
    setPaySuccess('');
    setPendingTx(null);
    setFees(null);

    try {
      setLookupNo(trimmed);
      await refreshFees(trimmed);
    } catch (err) {
      setLookupError(
        err instanceof ApiClientError ? err.message : 'Could not find student. Check your number and try again.',
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const onInvoiceChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const invoice = fees?.openInvoices.find((i) => i.id === invoiceId);
    setAmount(invoice?.balance ?? 0);
  };

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    if (!fees || !selectedInvoiceId) {
      setPayError('Select an invoice to pay.');
      return;
    }
    if (amount <= 0) {
      setPayError('Enter a valid amount.');
      return;
    }
    const normalizedPhone = normalizeUgPhone(phone);
    if (!/^256\d{9}$/.test(normalizedPhone)) {
      setPayError('Enter a valid Uganda mobile number (e.g. 0772 123 456).');
      return;
    }

    setSubmitting(true);
    setPayError('');
    setPaySuccess('');

    try {
      const result = await publicFinanceApi.initiateMobileMoney({
        studentNo: lookupNo,
        invoiceId: selectedInvoiceId,
        amount,
        phoneNumber: normalizedPhone,
      });
      const tx = await publicFinanceApi.getGatewayTransaction(result.transactionId, lookupNo);
      setPendingTx(tx);
      setPaySuccess(result.message ?? 'Check your phone to approve the payment.');
    } catch (err) {
      setPayError(err instanceof ApiClientError ? err.message : 'Could not start payment. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedInvoice = fees?.openInvoices.find((i) => i.id === selectedInvoiceId);

  return (
    <section className="landing-pay" id="pay">
      <div className="landing-section-inner">
        <div className="landing-section-header">
          <h2>Pay School Fees</h2>
          <p>Students and guardians — enter your student number and pay with MTN or Airtel Mobile Money.</p>
        </div>

        <div className="landing-pay-card">
          <form className="landing-pay-lookup" onSubmit={handleLookup}>
            <Input
              label="Student number"
              placeholder="e.g. NS20260001"
              value={studentNo}
              onChange={(e) => setStudentNo(e.target.value.toUpperCase())}
              required
            />
            <Button type="submit" disabled={lookupLoading}>
              {lookupLoading ? 'Looking up…' : 'Find my balance'}
            </Button>
          </form>

          {lookupError && <Alert type="error" message={lookupError} onClose={() => setLookupError('')} />}

          {lookupLoading && <Loading />}

          {fees && !lookupLoading && (
            <div className="landing-pay-details">
              <div className="landing-pay-student">
                <div>
                  <p className="landing-pay-student-name">{fees.studentName}</p>
                  <p className="text-muted">{fees.programName} · {fees.studentNo}</p>
                </div>
                <div className="landing-pay-balance">
                  <span className="landing-pay-balance-label">Outstanding</span>
                  <strong>{formatUgx(fees.outstandingBalance)}</strong>
                  <span className={`badge ${feeStatusBadgeClass(fees.feeStatus)}`}>{fees.feeStatus}</span>
                </div>
              </div>

              {fees.outstandingBalance <= 0 ? (
                <Alert type="success" message="You have no outstanding balance. Thank you!" />
              ) : (
                <>
                  {jpesaCheckDone && !jpesaConfigured && (
                    <Alert
                      type="error"
                      message="Online mobile money is temporarily unavailable. Please pay at the finance office or try again later."
                    />
                  )}

                  {paySuccess && <Alert type="success" message={paySuccess} onClose={() => setPaySuccess('')} />}
                  {payError && <Alert type="error" message={payError} onClose={() => setPayError('')} />}
                  {pendingTx && (
                    <Alert
                      type="success"
                      message={`Waiting for approval on your phone… Ref: ${pendingTx.externalTransactionId}`}
                    />
                  )}

                  <form className="landing-pay-form" onSubmit={handlePay}>
                    <label className="landing-pay-field">
                      <span>Invoice</span>
                      <select
                        value={selectedInvoiceId}
                        onChange={(e) => onInvoiceChange(e.target.value)}
                        required
                      >
                        {fees.openInvoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNo} — {inv.academicYear} — balance {formatUgx(inv.balance)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="landing-pay-row">
                      <Input
                        label="Amount (UGX)"
                        type="number"
                        min={1}
                        max={selectedInvoice?.balance}
                        value={amount || ''}
                        onChange={(e) => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                        required
                      />
                      <Input
                        label="Mobile number (MTN / Airtel)"
                        type="tel"
                        placeholder="0772 123 456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={!!pendingTx}
                      />
                    </div>

                    <p className="landing-pay-hint">
                      A payment prompt is sent to this number. Approve on your phone to complete payment.
                    </p>

                    <Button
                      type="submit"
                      className="landing-cta-primary landing-pay-submit"
                      disabled={submitting || !jpesaConfigured || !!pendingTx || !selectedInvoiceId}
                    >
                      {submitting ? 'Sending request…' : `Pay ${amount > 0 ? formatUgx(amount) : 'now'}`.trim()}
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
