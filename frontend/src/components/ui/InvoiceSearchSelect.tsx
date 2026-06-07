import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { financeApi } from '../../api/endpoints';
import { useSearchableSelectDismiss } from '../../hooks/useSearchableSelectDismiss';
import { SearchableSelectList } from './SearchableSelectList';
import type { Invoice } from '../../types';

function invoiceLabel(invoice: Invoice) {
  return `${invoice.invoiceNo} — ${invoice.studentName}`;
}

interface InvoiceSearchSelectProps {
  label?: string;
  value: string;
  onChange: (invoiceId: string, invoice?: Invoice) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  /** When true, only lists invoices with an outstanding balance. */
  openBalanceOnly?: boolean;
}

export function InvoiceSearchSelect({
  label = 'Invoice',
  value,
  onChange,
  required,
  disabled,
  error,
  className = '',
  placeholder = 'Search by invoice no or student...',
  openBalanceOnly = false,
}: InvoiceSearchSelectProps) {
  const autoId = useId();
  const selectId = `invoice-search-${autoId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState<Invoice[]>([]);
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
    if (options.some((i) => i.id === value)) return;
    financeApi
      .getInvoice(value)
      .then((invoice) => setSelectedLabel(invoiceLabel(invoice)))
      .catch(() => setSelectedLabel(''));
  }, [value, options]);

  const loadInvoices = useCallback(
    async (term: string) => {
      setLoading(true);
      try {
        const result = await financeApi.getInvoices(1, 20, term || undefined);
        let items = result.items ?? [];
        if (openBalanceOnly) {
          items = items.filter((i) => i.balance > 0);
        }
        setOptions(items);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [openBalanceOnly],
  );

  useEffect(() => {
    if (!open) return;
    void loadInvoices(debouncedSearch);
  }, [open, debouncedSearch, loadInvoices]);

  const dismiss = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  useSearchableSelectDismiss(open, rootRef, listRef, dismiss);

  const handleSelect = (invoice: Invoice) => {
    onChange(invoice.id, invoice);
    setSelectedLabel(invoiceLabel(invoice));
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
          aria-label="Toggle invoice list"
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
            {debouncedSearch.trim() ? 'No invoices found' : 'Type an invoice number or student name'}
          </li>
        ) : (
          options.map((invoice) => (
            <li
              key={invoice.id}
              role="option"
              aria-selected={invoice.id === value}
              className={`searchable-select-option${invoice.id === value ? ' is-selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(invoice)}
            >
              <span>{invoiceLabel(invoice)}</span>
              <span className="searchable-select-option-meta">
                Balance UGX {invoice.balance.toLocaleString()} · {invoice.status}
              </span>
            </li>
          ))
        )}
      </SearchableSelectList>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
