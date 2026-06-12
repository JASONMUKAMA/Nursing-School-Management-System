import { useState } from 'react';
import { classroomApi } from '../../api/endpoints';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../../utils/toast';
import type { Quiz, QuizQuestionDraft, QuizQuestionType } from '../../types';

interface QuizBuilderProps {
  sessionId: string;
  onSaved: (quiz: Quiz) => void;
  onCancel: () => void;
}

function emptyQuestion(type: QuizQuestionType = 'MultipleChoice'): QuizQuestionDraft {
  if (type === 'TrueFalse') {
    return {
      text: '',
      questionType: type,
      points: 1,
      correctAnswerText: null,
      options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ],
    };
  }
  if (type === 'ShortAnswer') {
    return { text: '', questionType: type, points: 1, correctAnswerText: '', options: [] };
  }
  return {
    text: '',
    questionType: type,
    points: 1,
    correctAnswerText: null,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  };
}

export function QuizBuilder({ sessionId, onSaved, onCancel }: QuizBuilderProps) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  const updateQuestion = (index: number, patch: Partial<QuizQuestionDraft>) =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const changeType = (index: number, type: QuizQuestionType) =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...emptyQuestion(type), text: q.text, points: q.points } : q)));

  const updateOption = (qIndex: number, oIndex: number, text: string) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, text } : o)) }
          : q,
      ),
    );

  const markCorrect = (qIndex: number, oIndex: number) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIndex })) }
          : q,
      ),
    );

  const addOption = (qIndex: number) =>
    setQuestions((qs) =>
      qs.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, { text: '', isCorrect: false }] } : q)),
    );

  const removeOption = (qIndex: number, oIndex: number) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q,
      ),
    );

  const validate = (): string | null => {
    if (!title.trim()) return 'Give the quiz a title.';
    if (questions.length === 0) return 'Add at least one question.';
    for (const [i, q] of questions.entries()) {
      const label = `Question ${i + 1}`;
      if (!q.text.trim()) return `${label} needs text.`;
      if (q.points <= 0) return `${label} needs points greater than zero.`;
      if (q.questionType === 'ShortAnswer') {
        if (!q.correctAnswerText?.trim()) return `${label} needs a correct answer.`;
      } else {
        if (q.options.some((o) => !o.text.trim())) return `${label} has an empty option.`;
        if (q.options.length < 2) return `${label} needs at least two options.`;
        if (!q.options.some((o) => o.isCorrect)) return `${label} needs a correct option selected.`;
      }
    }
    return null;
  };

  const save = async (publish: boolean) => {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      let quiz = await classroomApi.createQuiz({ liveSessionId: sessionId, title: title.trim(), questions });
      if (publish) {
        quiz = await classroomApi.publishQuiz(quiz.id);
        toast.success('Quiz published — students can answer it now.');
      } else {
        toast.success('Quiz saved as draft.');
      }
      onSaved(quiz);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the quiz.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quiz-builder">
      <Input label="Quiz Title" value={title} placeholder="e.g. Week 6 Knowledge Check" onChange={(e) => setTitle(e.target.value)} />

      {questions.map((q, qIndex) => (
        <div key={qIndex} className="quiz-builder-question">
          <div className="quiz-builder-question-header">
            <strong>Question {qIndex + 1}</strong>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qIndex))}
              disabled={questions.length === 1}
            >
              Remove
            </Button>
          </div>

          <Input
            label="Question"
            value={q.text}
            placeholder="Type the question..."
            onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
          />

          <div className="quiz-builder-row">
            <Select
              label="Type"
              value={q.questionType}
              onChange={(e) => changeType(qIndex, e.target.value as QuizQuestionType)}
              options={[
                { value: 'MultipleChoice', label: 'Multiple Choice' },
                { value: 'TrueFalse', label: 'True / False' },
                { value: 'ShortAnswer', label: 'Short Answer' },
              ]}
            />
            <Input
              label="Points"
              type="number"
              min={1}
              value={String(q.points)}
              onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) || 1 })}
            />
          </div>

          {q.questionType === 'ShortAnswer' ? (
            <Input
              label="Correct Answer"
              value={q.correctAnswerText ?? ''}
              placeholder="Exact expected answer (case-insensitive)"
              onChange={(e) => updateQuestion(qIndex, { correctAnswerText: e.target.value })}
            />
          ) : (
            <div className="quiz-builder-options">
              <span className="quiz-builder-options-label">Options — tick the correct one</span>
              {q.options.map((o, oIndex) => (
                <div key={oIndex} className="quiz-builder-option">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={o.isCorrect}
                    onChange={() => markCorrect(qIndex, oIndex)}
                    title="Mark as the correct answer"
                  />
                  {q.questionType === 'TrueFalse' ? (
                    <span>{o.text}</span>
                  ) : (
                    <>
                      <input
                        className="input quiz-builder-option-input"
                        value={o.text}
                        placeholder={`Option ${oIndex + 1}`}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeOption(qIndex, oIndex)} disabled={q.options.length <= 2}>
                        ×
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {q.questionType === 'MultipleChoice' && (
                <Button size="sm" variant="secondary" onClick={() => addOption(qIndex)}>
                  + Add Option
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      <Button variant="secondary" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
        + Add Question
      </Button>

      <div className="quiz-builder-actions">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button variant="secondary" onClick={() => void save(false)} disabled={saving}>Save Draft</Button>
        <Button onClick={() => void save(true)} disabled={saving}>
          {saving ? 'Saving…' : 'Save & Publish'}
        </Button>
      </div>
    </div>
  );
}
