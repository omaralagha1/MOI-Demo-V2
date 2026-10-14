'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  csv?: (row: T) => string;
  className?: string;
};

type Sort = { key: string; direction: 'asc' | 'desc' };

/** Sortable, paginated, exportable table. Filtering is done by the caller and passed in as rows. */
export function DataTable<T>({ rows, columns, rowKey, caption, toolbar, initialSort, exportName, exportColumns, empty, pageSizes = [10, 25, 50] }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; caption: string; toolbar?: ReactNode; initialSort?: Sort; exportName?: string;
  /** CSV columns when they differ from the on-screen columns (defaults to columns that define `csv`). */
  exportColumns?: Pick<Column<T>, 'header' | 'csv'>[]; empty?: ReactNode; pageSizes?: number[];
}) {
  const { t, f, locale, number } = useI18n();
  const [sort, setSort] = useState<Sort | null>(initialSort || null);
  const [pageSize, setPageSize] = useState(pageSizes[0]);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const column = columns.find(item => item.key === sort?.key);
    if (!sort || !column?.sortValue) return rows;
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      const x = column.sortValue!(a), y = column.sortValue!(b);
      const result = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y));
      return sort.direction === 'asc' ? result : -result;
    });
  }, [rows, columns, sort, locale]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { setPage(0); }, [rows, pageSize]);
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggle = (key: string) => setSort(previous => previous?.key === key ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });

  const exportCsv = () => {
    const exportable = (exportColumns || columns).filter(column => column.csv);
    const escape = (value: string) => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
    const lines = [exportable.map(column => escape(column.header)).join(','), ...sorted.map(row => exportable.map(column => escape(column.csv!(row))).join(','))];
    const url = URL.createObjectURL(new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `${exportName || 'export'}.csv` });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="card data-table-card">
      {(toolbar || exportName) && (
        <div className="table-toolbar">
          <div className="table-filters">{toolbar}</div>
          {exportName && <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={!sorted.length}><Download size={16} aria-hidden="true" />{t.table.export}</button>}
        </div>
      )}
      {sorted.length === 0 ? (empty) : (
        <>
          <div className="table-scroll" role="region" aria-label={t.table.tableRegion} tabIndex={0}>
            <table className="data-table">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map(column => {
                    const active = sort?.key === column.key;
                    return (
                      <th key={column.key} scope="col" className={column.className} aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
                        {column.sortValue ? (
                          <button type="button" className="sort-button" onClick={() => toggle(column.key)} aria-label={f(t.table.sortBy, { column: column.header })}>
                            {column.header}
                            {active ? (sort!.direction === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />) : <ArrowUpDown size={14} aria-hidden="true" />}
                          </button>
                        ) : column.header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map(row => (
                  <tr key={rowKey(row)}>
                    {columns.map(column => <td key={column.key} className={column.className}>{column.render(row)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span aria-live="polite">{f(t.table.showing, { from: number(current * pageSize + 1), to: number(Math.min(sorted.length, (current + 1) * pageSize)), total: number(sorted.length) })}</span>
            <div className="pagination">
              <label className="nowrap" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {t.table.rowsPerPage}
                <select className="select" value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
                  {pageSizes.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label={t.table.previous}><ChevronLeft size={18} aria-hidden="true" className="flip-rtl" /></button>
              <span className="nowrap">{f(t.table.pageOf, { page: number(current + 1), pages: number(pages) })}</span>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label={t.table.next}><ChevronRight size={18} aria-hidden="true" className="flip-rtl" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
