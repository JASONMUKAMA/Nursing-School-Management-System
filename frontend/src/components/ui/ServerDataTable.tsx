import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Loading } from './Loading';
import type { PagedResult } from '../../types';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Plain-text value for print export; falls back to empty string. */
  print?: (row: T) => string;
  width?: string;
}

interface ServerDataTableProps<T> {
  columns: Column<T>[];
  keyField: keyof T | ((row: T) => string);
  fetchData: (page: number, pageSize: number, search: string) => Promise<PagedResult<T>>;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  refreshKey?: number;
  printable?: boolean;
  printTitle?: string;
  onRowClick?: (row: T) => void;
  /** When set, overrides the internal search box value for queries and print. */
  externalSearch?: string;
  /** Hide the built-in search input (use with externalSearch from a parent toolbar). */
  hideSearch?: boolean;
}

export function ServerDataTable<T>({
  columns,
  keyField,
  fetchData,
  pageSize = 20,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No records found.',
  refreshKey = 0,
  printable = false,
  printTitle = 'Report',
  onRowClick,
  externalSearch,
  hideSearch = false,
}: ServerDataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, externalSearch, refreshKey]);

  const querySearch = externalSearch !== undefined ? externalSearch : debouncedSearch;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchData(page, pageSize, querySearch);
      const items = result.items ?? (result as { Items?: T[] }).Items ?? [];
      const total = result.totalCount ?? (result as { TotalCount?: number }).TotalCount ?? 0;
      setData(items);
      setTotalCount(total);
    } catch (err) {
      setData([]);
      setTotalCount(0);
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize, querySearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const getKey = (row: T): string =>
    typeof keyField === 'function' ? keyField(row) : String(row[keyField]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const limit = Math.min(Math.max(totalCount, 1), 500);
      const result = await fetchData(1, limit, querySearch);
      const printedAt = new Date().toLocaleString('en-UG', { dateStyle: 'full', timeStyle: 'short' });
      const filterNote = querySearch ? `Filter: "${querySearch}"` : 'All matching events';
      const headerCells = columns.map((col) => `<th>${escapeHtml(col.header)}</th>`).join('');
      const bodyRows = result.items
        .map((row) => {
          const cells = columns
            .map((col) => `<td>${escapeHtml(col.print?.(row) ?? '')}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(printTitle)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
    tr:nth-child(even) td { background: #fafafa; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(printTitle)}</h1>
  <p class="meta">${escapeHtml(filterNote)} · ${result.items.length} event(s) · Printed ${escapeHtml(printedAt)}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows || '<tr><td colspan="' + columns.length + '">No events</td></tr>'}</tbody>
  </table>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
</body>
</html>`;
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        window.alert('Allow pop-ups to print the event list.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="server-datatable">
      <div className="server-datatable-toolbar">
        {!hideSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        )}
        <div className="server-datatable-toolbar-actions">
          {printable && (
            <Button variant="secondary" size="sm" onClick={() => void handlePrint()} disabled={loading || printing || totalCount === 0}>
              {printing ? 'Preparing…' : 'Print'}
            </Button>
          )}
          <span className="text-muted server-datatable-count">
            {totalCount > 0 ? `${from}–${to} of ${totalCount.toLocaleString()}` : '0 results'}
          </span>
        </div>
      </div>

      {error && <p className="server-datatable-error">{error}</p>}

      {loading ? (
        <Loading />
      ) : data.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={getKey(row)}
                  className={onRowClick ? 'data-table-row-clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="server-datatable-pagination">
        <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(1)}>
          First
        </Button>
        <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
          Prev
        </Button>
        <span className="text-muted">
          Page {page} of {totalPages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)}>
          Last
        </Button>
      </div>
    </div>
  );
}
