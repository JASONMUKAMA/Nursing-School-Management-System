import type { StudentInvoicePreview } from '../../types';
import { describeStudentFeeStatus, feeStatusBadgeClass, formatUgx } from '../../utils/feeDisplay';
import { Loading } from '../ui/Loading';

interface StudentFeeContextPanelProps {
  preview: StudentInvoicePreview | null;
  loading?: boolean;
  onApplySuggestion?: () => void;
}

export function StudentFeeContextPanel({ preview, loading, onApplySuggestion }: StudentFeeContextPanelProps) {
  if (loading) return <div className="context-panel"><Loading /></div>;
  if (!preview) return null;

  return (
    <div className="context-panel">
      <div className="context-panel-header">
        <strong>{preview.studentName}</strong>
        <span className={`badge ${feeStatusBadgeClass(preview.feeStatus)}`}>{preview.feeStatus}</span>
      </div>
      <p className="context-panel-meta">{preview.programName}</p>
      <p className="context-panel-summary">
        {describeStudentFeeStatus({
          feeStatus: preview.feeStatus,
          balance: preview.outstandingBalance,
          nextDueDate: preview.nextDueDate,
          lastPaymentDate: preview.lastPaymentDate,
        })}
      </p>
      {preview.suggestedAmount >= 100_000 && onApplySuggestion && (
        <button type="button" className="link-button context-panel-action" onClick={onApplySuggestion}>
          Use suggested fee {formatUgx(preview.suggestedAmount)} for {preview.suggestedAcademicYear}
        </button>
      )}
    </div>
  );
}
