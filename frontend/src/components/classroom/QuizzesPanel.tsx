import { useEffect, useState } from 'react';
import { classroomApi } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Loading';
import { toast } from '../../utils/toast';
import { QuizBuilder } from './QuizBuilder';
import type { Quiz, QuizResult } from '../../types';

function QuizStatusBadge({ status }: { status: Quiz['status'] }) {
  const cls = status === 'Published' ? 'badge-live' : status === 'Closed' ? 'badge-inactive' : 'badge-pending';
  return <span className={`badge ${cls}`}>{status}</span>;
}

// ---------------- Teacher view ----------------

interface TeacherQuizzesPanelProps {
  sessionId: string;
  quizzes: Quiz[];
  liveResults: Record<string, QuizResult[]>;
  onQuizSaved: (quiz: Quiz) => void;
  onQuizUpdated: (quiz: Quiz) => void;
  onResultsLoaded: (quizId: string, results: QuizResult[]) => void;
}

export function TeacherQuizzesPanel({
  sessionId, quizzes, liveResults, onQuizSaved, onQuizUpdated, onResultsLoaded,
}: TeacherQuizzesPanelProps) {
  const [building, setBuilding] = useState(false);
  const [openQuizId, setOpenQuizId] = useState<string | null>(null);

  const toggleResults = async (quiz: Quiz) => {
    if (openQuizId === quiz.id) {
      setOpenQuizId(null);
      return;
    }
    setOpenQuizId(quiz.id);
    try {
      onResultsLoaded(quiz.id, await classroomApi.getQuizResults(quiz.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load results.');
    }
  };

  const publish = async (quiz: Quiz) => {
    try {
      onQuizUpdated(await classroomApi.publishQuiz(quiz.id));
      toast.success('Quiz published — it just appeared on every student screen.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish.');
    }
  };

  const close = async (quiz: Quiz) => {
    try {
      onQuizUpdated(await classroomApi.closeQuiz(quiz.id));
      toast.success('Quiz closed. No more submissions accepted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close.');
    }
  };

  if (building) {
    return (
      <div className="classroom-panel">
        <QuizBuilder
          sessionId={sessionId}
          onSaved={(quiz) => {
            onQuizSaved(quiz);
            setBuilding(false);
          }}
          onCancel={() => setBuilding(false)}
        />
      </div>
    );
  }

  return (
    <div className="classroom-panel">
      <Button size="sm" onClick={() => setBuilding(true)}>+ New Quiz</Button>

      {quizzes.length === 0 ? (
        <p className="empty-state">No quizzes yet. Create one and publish it when you are ready.</p>
      ) : (
        quizzes.map((quiz) => {
          const results = liveResults[quiz.id] ?? [];
          return (
            <div key={quiz.id} className="quiz-card">
              <div className="quiz-card-header">
                <div>
                  <strong>{quiz.title}</strong>
                  <span className="text-muted"> · {quiz.questionCount} question{quiz.questionCount === 1 ? '' : 's'} · {quiz.maxScore} pts</span>
                </div>
                <QuizStatusBadge status={quiz.status} />
              </div>
              <div className="quiz-card-actions">
                {quiz.status === 'Draft' && (
                  <Button size="sm" onClick={() => void publish(quiz)}>Publish</Button>
                )}
                {quiz.status === 'Published' && (
                  <Button size="sm" variant="danger" onClick={() => void close(quiz)}>Close Quiz</Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => void toggleResults(quiz)}>
                  {openQuizId === quiz.id ? 'Hide Results' : `Results (${results.length})`}
                </Button>
              </div>

              {openQuizId === quiz.id && (
                <div className="quiz-results">
                  {results.length === 0 ? (
                    <p className="text-muted">No submissions yet — results appear here the moment students submit.</p>
                  ) : (
                    <table className="data-table quiz-results-table">
                      <thead>
                        <tr><th>Student</th><th>Student No</th><th>Score</th><th>Submitted</th></tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.submissionId}>
                            <td>{r.studentName}</td>
                            <td>{r.studentNo}</td>
                            <td>
                              <strong>{r.score}</strong> / {r.maxScore}
                            </td>
                            <td>{new Date(r.submittedAt).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------------- Student view ----------------

interface StudentQuizzesPanelProps {
  quizzes: Quiz[];
}

export function StudentQuizzesPanel({ quizzes }: StudentQuizzesPanelProps) {
  const visible = quizzes.filter((q) => q.status !== 'Draft');

  if (visible.length === 0) {
    return (
      <div className="classroom-panel">
        <p className="empty-state">No quizzes yet. When your lecturer publishes one, it appears here instantly.</p>
      </div>
    );
  }

  return (
    <div className="classroom-panel">
      {visible.map((quiz) => (
        <StudentQuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}

function StudentQuizCard({ quiz }: { quiz: Quiz }) {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId: string | null; answerText: string | null }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    classroomApi
      .getMyQuizResult(quiz.id)
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((err) => {
        if (!cancelled && !(err instanceof ApiClientError && err.status === 404)) {
          toast.error('Could not check your previous submission.');
        }
      })
      .finally(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, [quiz.id]);

  const submit = async () => {
    const missing = quiz.questions.filter((q) => {
      const a = answers[q.id];
      return !a || (q.questionType === 'ShortAnswer' ? !a.answerText?.trim() : !a.selectedOptionId);
    });
    if (missing.length > 0) {
      toast.error(`Answer all questions first (${missing.length} unanswered).`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: answers[q.id]?.selectedOptionId ?? null,
        answerText: answers[q.id]?.answerText ?? null,
      }));
      const graded = await classroomApi.submitQuiz(quiz.id, payload);
      setResult(graded);
      toast.success(`Submitted! You scored ${graded.score} / ${graded.maxScore}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit the quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!checked) return <Loading />;

  return (
    <div className="quiz-card">
      <div className="quiz-card-header">
        <strong>{quiz.title}</strong>
        <QuizStatusBadge status={quiz.status} />
      </div>

      {result ? (
        <div className="quiz-student-result">
          <p className="quiz-score">
            Your score: <strong>{result.score}</strong> / {result.maxScore}
          </p>
          <ul className="quiz-answer-review">
            {result.answers.map((a) => (
              <li key={a.questionId} className={a.isCorrect ? 'answer-correct' : 'answer-wrong'}>
                <span>{a.isCorrect ? '✅' : '❌'} {a.questionText}</span>
                {!a.isCorrect && a.correctAnswer && (
                  <span className="text-muted"> — correct answer: {a.correctAnswer}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : quiz.status === 'Closed' ? (
        <p className="text-muted">This quiz is closed and no longer accepts submissions.</p>
      ) : (
        <div className="quiz-taker">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="quiz-taker-question">
              <p className="quiz-taker-question-text">
                {index + 1}. {q.text} <span className="text-muted">({q.points} pt{q.points === 1 ? '' : 's'})</span>
              </p>
              {q.questionType === 'ShortAnswer' ? (
                <input
                  className="input"
                  placeholder="Type your answer..."
                  value={answers[q.id]?.answerText ?? ''}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.id]: { selectedOptionId: null, answerText: e.target.value } }))
                  }
                />
              ) : (
                q.options.map((o) => (
                  <label key={o.id} className="quiz-taker-option">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id]?.selectedOptionId === o.id}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, [q.id]: { selectedOptionId: o.id, answerText: null } }))
                      }
                    />
                    {o.text}
                  </label>
                ))
              )}
            </div>
          ))}
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Quiz'}
          </Button>
        </div>
      )}
    </div>
  );
}
