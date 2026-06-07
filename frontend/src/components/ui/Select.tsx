import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { SearchableSelectList } from './SearchableSelectList';
import { useSearchableSelectDismiss } from '../../hooks/useSearchableSelectDismiss';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  id?: string;
  className?: string;
  value?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
}

export function Select({
  label,
  error,
  options,
  id,
  className = '',
  value = '',
  name,
  required,
  disabled,
  placeholder = 'Search or select...',
  onChange,
  onBlur,
}: SelectProps) {
  const autoId = useId();
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : `select-${autoId}`);
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.value === value);
  const displayLabel = value ? (selected?.label ?? '') : '';
  const emptyOptionLabel = options.find((o) => !o.value)?.label;
  const effectivePlaceholder = emptyOptionLabel ?? placeholder;

  const selectableOptions = options.filter((o) => o.value);
  const filtered = options.filter((o) => {
    if (!search.trim()) return !!o.value;
    const q = search.toLowerCase();
    return o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
  });

  const dismiss = useCallback(() => {
    setOpen(false);
    setSearch('');
    onBlur?.();
  }, [onBlur]);

  useSearchableSelectDismiss(open, rootRef, listRef, dismiss);

  const emitChange = (nextValue: string) => {
    onChange?.({
      target: { value: nextValue, name: name ?? '' },
    } as ChangeEvent<HTMLSelectElement>);
  };

  const handleSelect = (optValue: string) => {
    emitChange(optValue);
    setOpen(false);
    setSearch('');
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setOpen(true);
    setSearch('');
    window.requestAnimationFrame(() => {
      controlRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };

  const handleInputChange = (text: string) => {
    setSearch(text);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      dismiss();
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0].value);
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
          placeholder={open ? 'Type to search...' : effectivePlaceholder}
          value={open ? search : displayLabel}
          onChange={(e) => handleInputChange(e.target.value)}
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
          aria-label="Toggle options"
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
        repositionDeps={[filtered.length, search]}
      >
        {filtered.length === 0 ? (
          <li className="searchable-select-empty">
            {selectableOptions.length === 0
              ? 'No options available'
              : search.trim()
                ? 'No matches found'
                : 'Type to filter options'}
          </li>
        ) : (
          filtered.map((opt) => (
            <li
              key={opt.value || '__empty__'}
              role="option"
              aria-selected={opt.value === value}
              className={`searchable-select-option${opt.value === value ? ' is-selected' : ''}${!opt.value ? ' is-placeholder' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))
        )}
      </SearchableSelectList>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
