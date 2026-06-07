import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { studentsApi } from '../../api/endpoints';
import { useSearchableSelectDismiss } from '../../hooks/useSearchableSelectDismiss';
import { SearchableSelectList } from './SearchableSelectList';
import type { Student } from '../../types';

function studentLabel(student: Student) {
  return `${student.studentNo} — ${student.firstName} ${student.lastName}`;
}

interface StudentSearchSelectProps {
  label?: string;
  value: string;
  onChange: (studentId: string) => void;
  onStudentChange?: (student: Student | null) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
}

export function StudentSearchSelect({
  label = 'Student',
  value,
  onChange,
  onStudentChange,
  required,
  disabled,
  error,
  className = '',
  placeholder = 'Search by name or student number...',
}: StudentSearchSelectProps) {
  const autoId = useId();
  const selectId = `student-search-${autoId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState<Student[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    if (options.some((s) => s.id === value)) return;
    studentsApi
      .getById(value)
      .then((student) => setSelectedLabel(studentLabel(student)))
      .catch(() => setSelectedLabel(''));
  }, [value, options]);

  const loadStudents = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const result = await studentsApi.getAll(1, 20, term || undefined);
      setOptions(result.items ?? []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadStudents(debouncedSearch);
  }, [open, debouncedSearch, loadStudents]);

  const dismiss = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  useSearchableSelectDismiss(open, rootRef, listRef, dismiss);

  const handleSelect = (student: Student) => {
    onChange(student.id);
    onStudentChange?.(student);
    setSelectedLabel(studentLabel(student));
    setOpen(false);
    setSearch('');
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setOpen(true);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      dismiss();
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && options.length > 0) {
      e.preventDefault();
      handleSelect(options[0]);
    } else if (e.key === 'ArrowDown' && !open) {
      setOpen(true);
    }
  };

  return (
    <div className={`form-group searchable-select ${className}`.trim()} ref={rootRef}>
      {label && <label htmlFor={selectId}>{label}</label>}

      <div ref={controlRef} className={`searchable-select-control${error ? ' input-error' : ''}${disabled ? ' searchable-select-disabled' : ''}`}>
        <input
          ref={inputRef}
          id={selectId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${selectId}-listbox`}
          disabled={disabled}
          required={required && !value}
          placeholder={open ? 'Type to search...' : placeholder}
          value={open ? search : selectedLabel}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="searchable-select-input"
          autoComplete="off"
        />
        <button
          type="button"
          className="searchable-select-chevron"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Toggle student list"
          onClick={() => {
            if (disabled) return;
            if (open) {
              dismiss();
            } else {
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
        >
          ▾
        </button>
      </div>

      <SearchableSelectList
        open={open && !disabled}
        anchorRef={controlRef}
        listId={`${selectId}-listbox`}
        listRef={listRef}
        repositionDeps={[options.length, debouncedSearch, loading]}
      >
        {loading ? (
          <li className="searchable-select-empty">Searching...</li>
        ) : options.length === 0 ? (
          <li className="searchable-select-empty">
            {debouncedSearch.trim() ? 'No students found' : 'Type a name or student number'}
          </li>
        ) : (
          options.map((student) => (
            <li
              key={student.id}
              role="option"
              aria-selected={student.id === value}
              className={`searchable-select-option${student.id === value ? ' is-selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(student)}
            >
              <span>{studentLabel(student)}</span>
              <span className="searchable-select-option-meta">{student.programName}</span>
            </li>
          ))
        )}
      </SearchableSelectList>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
