import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usersApi } from '../../api/endpoints';
import { useSearchableSelectDismiss } from '../../hooks/useSearchableSelectDismiss';
import { SearchableSelectList } from './SearchableSelectList';
import type { User } from '../../types';

const TEACHER_ROLES = new Set(['Lecturer', 'ClinicalCoordinator', 'Registrar']);

function teacherLabel(user: User) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.userName;
  return `${user.userName} — ${name}`;
}

function isTeacher(user: User) {
  return user.roles.some((role) => TEACHER_ROLES.has(role));
}

interface TeacherSearchSelectProps {
  label?: string;
  value: string;
  onChange: (userId: string) => void;
  onTeacherChange?: (user: User | null) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
}

export function TeacherSearchSelect({
  label = 'Teacher',
  value,
  onChange,
  onTeacherChange,
  required,
  disabled,
  error,
  className = '',
  placeholder = 'Search by name or username...',
}: TeacherSearchSelectProps) {
  const autoId = useId();
  const selectId = `teacher-search-${autoId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState<User[]>([]);
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
    if (options.some((u) => u.id === value)) return;
    usersApi
      .getById(value)
      .then((user) => {
        if (isTeacher(user)) {
          setSelectedLabel(teacherLabel(user));
          onTeacherChange?.(user);
        }
      })
      .catch(() => setSelectedLabel(''));
  }, [value, options, onTeacherChange]);

  const loadTeachers = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const result = await usersApi.getAll(1, 30, term || undefined);
      setOptions(result.items.filter(isTeacher));
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadTeachers(debouncedSearch);
  }, [open, debouncedSearch, loadTeachers]);

  const dismiss = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  useSearchableSelectDismiss(open, rootRef, listRef, dismiss);

  const handleSelect = (user: User) => {
    onChange(user.id);
    onTeacherChange?.(user);
    setSelectedLabel(teacherLabel(user));
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
          aria-label="Toggle teacher list"
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
            {debouncedSearch.trim() ? 'No teachers found' : 'Type a name or username'}
          </li>
        ) : (
          options.map((user) => (
            <li
              key={user.id}
              role="option"
              aria-selected={user.id === value}
              className={`searchable-select-option${user.id === value ? ' is-selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(user)}
            >
              <span>{teacherLabel(user)}</span>
              <span className="searchable-select-option-meta">{user.roles.join(', ')}</span>
            </li>
          ))
        )}
      </SearchableSelectList>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
