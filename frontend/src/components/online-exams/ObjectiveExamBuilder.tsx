import { useEffect, useState } from 'react';
import { onlineExamsApi } from '../../api/endpoints';
import type { CourseOffering, ObjectiveQuestionDraft, ObjectiveQuestionType, OnlineExam } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../../utils/toast';

interface ObjectiveExamBuilderProps {
  offerings: CourseOffering[];
  exam?: OnlineExam | null;
  onSaved: () => void;
  onCancel: () => void;
}

function examToDrafts(exam: OnlineExam): ObjectiveQuestionDraft[] {
  return exam.questions.map((q) => ({
    text: q.text,
    questionType: q.questionType,
    points: q.points,
    options: q.options.map((o) => ({
      text: o.text,
      isCorrect: o.isCorrect === true,
    })),
  }));
}

function emptyQuestion(type: ObjectiveQuestionType = 'MultipleChoice'): ObjectiveQuestionDraft {
  if (type === 'TrueFalse') {
    return {
      text: '',
      questionType: type,
      points: 1,
      options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ],
    };
  }
  return {
    text: '',
    questionType: type,
    points: 1,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  };
}

export function ObjectiveExamBuilder({ offerings, exam, onSaved, onCancel }: ObjectiveExamBuilderProps) {
  const isEditing = Boolean(exam);
  const [courseOfferingId, setCourseOfferingId] = useState(exam?.courseOfferingId ?? '');
  const [title, setTitle] = useState(exam?.title ?? '');
  const [instructions, setInstructions] = useState(exam?.instructions ?? '');
  const [questions, setQuestions] = useState<ObjectiveQuestionDraft[]>(
    exam ? examToDrafts(exam) : [emptyQuestion()],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exam) return;
    setCourseOfferingId(exam.courseOfferingId);
    setTitle(exam.title);
    setInstructions(exam.instructions ?? '');
    setQuestions(examToDrafts(exam));
  }, [exam]);

  const updateQuestion = (index: number, patch: Partial<ObjectiveQuestionDraft>) =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const changeType = (index: number, type: ObjectiveQuestionType) =>
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
    if (!courseOfferingId) return 'Select a course offering.';
    if (!title.trim()) return 'Give the exam a title.';
    if (questions.length === 0) return 'Add at least one objective question.';
    for (const [i, q] of questions.entries()) {
      const label = `Question ${i + 1}`;
      if (!q.text.trim()) return `${label} needs text.`;
      if (q.points <= 0) return `${label} needs points greater than zero.`;
      if (q.options.some((o) => !o.text.trim())) return `${label} has an empty option.`;
      if (q.options.length < 2) return `${label} needs at least two options.`;
      if (!q.options.some((o) => o.isCorrect)) return `${label} needs a correct option selected.`;
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
      const payload = {
        courseOfferingId,
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        questions,
      };

      if (isEditing && exam) {
        await onlineExamsApi.updateExam(exam.id, payload);
        toast.success('Exam updated.');
      } else {
        let created = await onlineExamsApi.createExam(payload);
        if (publish) {
          created = await onlineExamsApi.publishExam(created.id);
          toast.success('Exam published — students can take it now.');
        } else {
          toast.success('Exam saved as draft.');
        }
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the exam.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quiz-builder">
      <Select
        label="Course offering"
        value={courseOfferingId}
        onChange={(e) => setCourseOfferingId(e.target.value)}
        options={[
          { value: '', label: 'Select course…' },
          ...offerings.map((o) => ({
            value: o.id,
            label: `${o.courseCode} — ${o.courseName}`,
          })),
        ]}
      />
      <Input label="Exam title" value={title} placeholder="e.g. Mid-semester Objective Test" onChange={(e) => setTitle(e.target.value)} />
      <Input
        label="Instructions (optional)"
        value={instructions}
        placeholder="e.g. Answer all questions. No negative marking."
        onChange={(e) => setInstructions(e.target.value)}
      />

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
            placeholder="Type the objective question…"
            onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
          />

          <div className="quiz-builder-row">
            <Select
              label="Type"
              value={q.questionType}
              onChange={(e) => changeType(qIndex, e.target.value as ObjectiveQuestionType)}
              options={[
                { value: 'MultipleChoice', label: 'Multiple Choice' },
                { value: 'TrueFalse', label: 'True / False' },
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

          <div className="quiz-builder-options">
            <span className="quiz-builder-options-label">Options — select the correct answer</span>
            {q.options.map((o, oIndex) => (
              <div key={oIndex} className="quiz-builder-option">
                <input
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={o.isCorrect}
                  onChange={() => markCorrect(qIndex, oIndex)}
                  title="Mark as correct"
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
        </div>
      ))}

      <Button variant="secondary" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
        + Add Question
      </Button>

      <div className="quiz-builder-actions">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        {isEditing ? (
          <Button onClick={() => void save(false)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => void save(false)} disabled={saving}>Save Draft</Button>
            <Button onClick={() => void save(true)} disabled={saving}>
              {saving ? 'Saving…' : 'Save & Publish'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
