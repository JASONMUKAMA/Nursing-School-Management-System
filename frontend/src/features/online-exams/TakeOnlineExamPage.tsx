import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { onlineExamsApi } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import type { OnlineExam, OnlineExamResult } from '../../types';
import { toast } from '../../utils/toast';

export function TakeOnlineExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<OnlineExam | null>(null);
  const [result, setResult] = useState<OnlineExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    (async () => {
      try {
        const [examData, myResult] = await Promise.all([
          onlineExamsApi.getExam(examId),
          onlineExamsApi.getMyExamResult(examId).catch((err) => {
            if (err instanceof ApiClientError && err.status === 404) return null;
            throw err;
          }),
        ]);
        if (cancelled) return;
        setExam(examData);
        setResult(myResult);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load exam.');
          navigate('/app/online-exams');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [examId, navigate]);

  const submit = async () => {
    if (!exam || !examId) return;
    const missing = exam.questions.filter((q) => !answers[q.id]);
    if (missing.length > 0) {
      toast.error(`Answer all questions first (${missing.length} unanswered).`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = exam.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: answers[q.id] ?? null,
      }));
      const graded = await onlineExamsApi.submitExam(examId, payload);
      setResult(graded);
      toast.success(`Submitted! You scored ${graded.score} / ${graded.maxScore}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (!exam) return null;

  const closed = exam.status === 'Closed';
  const alreadyDone = Boolean(result);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="text-muted" style={{ marginBottom: 4 }}>
            <Link to="/app/online-exams">← Online Exams</Link>
          </p>
          <h2>{exam.title}</h2>
          <p className="text-muted">{exam.courseCode} — {exam.courseName} · {exam.questionCount} questions · {exam.maxScore} points</p>
        </div>
        <span className={`badge ${exam.status === 'Published' ? 'badge-live' : exam.status === 'Closed' ? 'badge-inactive' : 'badge-pending'}`}>
          {exam.status}
        </span>
      </div>

      {exam.instructions && (
        <Card title="Instructions">
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{exam.instructions}</p>
        </Card>
      )}

      {alreadyDone && result && (
        <Card title="Your result">
          <p>
            <strong>{result.score}</strong> / {result.maxScore} points · submitted{' '}
            {new Date(result.submittedAt).toLocaleString()}
          </p>
          <div className="online-exam-review">
            {result.answers.map((a) => (
              <div key={a.questionId} className={`online-exam-review-item${a.isCorrect ? ' correct' : ' wrong'}`}>
                <p><strong>{a.questionText}</strong></p>
                <p className="text-muted">
                  Your answer: {exam.questions.find((q) => q.id === a.questionId)?.options.find((o) => o.id === a.selectedOptionId)?.text ?? '—'}
                  {!a.isCorrect && a.correctAnswer && <> · Correct: {a.correctAnswer}</>}
                  {' '}({a.pointsAwarded}/{a.points} pts)
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!alreadyDone && (
        <Card title="Questions">
          {closed ? (
            <p className="empty-state">This exam is closed and no longer accepts submissions.</p>
          ) : exam.status !== 'Published' ? (
            <p className="empty-state">This exam is not open yet.</p>
          ) : (
            <>
              {exam.questions.map((q, index) => (
                <fieldset key={q.id} className="online-exam-question">
                  <legend>
                    <strong>Q{index + 1}.</strong> {q.text}
                    <span className="text-muted"> ({q.points} pt{q.points === 1 ? '' : 's'})</span>
                  </legend>
                  <div className="online-exam-options">
                    {q.options.map((o) => (
                      <label key={o.id} className="online-exam-option">
                        <input
                          type="radio"
                          name={q.id}
                          value={o.id}
                          checked={answers[q.id] === o.id}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                        />
                        <span>{o.text}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div style={{ marginTop: 16 }}>
                <Button onClick={() => void submit()} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Exam'}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
