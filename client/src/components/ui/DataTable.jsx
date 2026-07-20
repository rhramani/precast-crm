import { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Download,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './DataTable.css';

// ── Lucide Icons ───────────────────────────────────────────────

const SearchIcon = () => <Search className="svg-icon" />;
const CloseIcon = () => <X className="svg-icon" />;
const ExportIcon = () => <Download className="svg-icon" />;
const SortIcon = () => <ChevronsUpDown className="svg-icon" style={{ opacity: 0.4 }} />;
const SortUpIcon = () => (
  <span className="svg-icon" style={{ color: 'var(--color-primary)', display: 'inline-flex' }}>
    <ChevronUp size={16} />
  </span>
);
const SortDownIcon = () => (
  <span className="svg-icon" style={{ color: 'var(--color-primary)', display: 'inline-flex' }}>
    <ChevronDown size={16} />
  </span>
);
const EmptyIcon = () => <PackageOpen className="svg-icon" />;
const ChevronLeftIcon = () => <ChevronLeft className="svg-icon" />;
const ChevronRightIcon = () => <ChevronRight className="svg-icon" />;

/**
 * DataTable — responsive and dynamic table component used across every list screen.
 * Props:
 *   columns: [{ key, label, render?, sortable?, width? }]
 *   data: array of row objects
 *   total: total count (from API meta)
 *   page, limit, onPageChange, onLimitChange
 *   onSearch, onSort (optional)
 *   isLoading, actions (JSX for toolbar right side, e.g. "+ Add" button)
 *   emptyMessage
 *   title
 *   showSearch (optional, default: true if onSearch is passed)
 *   exportable (optional, default: false — only Invoices, Billing, Reports modules)
 */
const DataTable = ({
  columns = [],
  data = [],
  total = 0,
  page = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  onSearch,
  onSort,
  isLoading = false,
  actions,
  emptyMessage = 'No records found.',
  title,
  subtitle,
  showSearch = true,
  exportable = false,
  filters,
  getRowClassName,
}) => {
  // --- States ---
  const [searchValue, setSearchValue] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fallback pagination states if handled client-side
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(limit);

  // View Mode: 'table' (desktop) or 'card' (mobile grid)
  const [viewMode, setViewMode] = useState('table');

  // Scroll shadows for desktop table overflow
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  // --- Refs ---
  const scrollContainerRef = useRef(null);

  // Handle mobile resize auto-switching
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('card');
      } else {
        setViewMode('table');
      }
    };
    handleResize(); // trigger on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll shadows tracking
  const checkScrollShadows = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftShadow(scrollLeft > 2);
    setShowRightShadow(scrollWidth - clientWidth - scrollLeft > 2);
  };

  useEffect(() => {
    if (viewMode === 'table') {
      checkScrollShadows();
      const el = scrollContainerRef.current;
      if (el) {
        el.addEventListener('scroll', checkScrollShadows);
        window.addEventListener('resize', checkScrollShadows);
      }
      return () => {
        if (el) el.removeEventListener('scroll', checkScrollShadows);
        window.removeEventListener('resize', checkScrollShadows);
      };
    }
  }, [viewMode, data, isLoading]);

  // --- Event Handlers ---
  const handleSearchChange = (val) => {
    setSearchValue(val);
    if (onSearch) {
      onSearch(val);
    } else {
      setLocalPage(1); // reset to page 1 locally
    }
  };

  const clearSearch = () => {
    handleSearchChange('');
  };

  const handleSortClick = (key) => {
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(newOrder);
    if (onSort) {
      onSort({ sortBy: key, sortOrder: newOrder });
    }
  };

  const handlePageChange = (p) => {
    if (onPageChange) {
      onPageChange(p);
    } else {
      setLocalPage(p);
    }
  };

  const handleLimitChange = (l) => {
    if (onLimitChange) {
      onLimitChange(l);
    } else {
      setLocalLimit(l);
      setLocalPage(1);
    }
  };

  // --- XLSX Export Logic ---
  const exportToXLSX = async () => {
    const XLSX = await import('xlsx');

    // Exclude action columns
    const activeCols = columns.filter((col) => col.key !== 'actions');

    // Use full server-paginated data or locally processed data
    const exportRows = onPageChange ? data : getProcessedClientData();

    // Build worksheet data: header row + data rows
    const wsData = [
      activeCols.map((col) => col.label || col.key),
      ...exportRows.map((row) =>
        activeCols.map((col) => {
          let val = row[col.key];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        })
      ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    const sheetName = title ? title.substring(0, 31) : 'Export';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const filename = `${title ? title.toLowerCase().replace(/\s+/g, '_') : 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // --- Local Fallback processing engine ---
  const getProcessedClientData = () => {
    let processed = [...data];

    // Local Search
    if (!onSearch && searchValue.trim() !== '') {
      const query = searchValue.toLowerCase().trim();
      processed = processed.filter((row) => {
        return columns.some((col) => {
          const val = row[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    // Local Sorting
    if (!onSort && sortKey) {
      processed.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
        if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processed;
  };

  // --- Select Active Data & Pagination Values ---
  const activePage = onPageChange ? page : localPage;
  const activeLimit = onLimitChange ? limit : localLimit;

  const processedClientData = getProcessedClientData();
  const displayTotal = onPageChange ? total : processedClientData.length;
  const totalPages = Math.ceil(displayTotal / activeLimit) || 1;

  const displayData = onPageChange
    ? data
    : processedClientData.slice((activePage - 1) * activeLimit, activePage * activeLimit);

  // --- Pagination page number calculations ---
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, activePage - 1);
      let end = Math.min(totalPages - 1, activePage + 1);

      if (activePage <= 2) {
        end = 4;
      }
      if (activePage >= totalPages - 1) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }
    return pages;
  };

  // --- Skeleton Loaders renders ---
  const renderTableSkeleton = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <tr key={`skeleton-row-${idx}`} className="data-table__row data-table__row--skeleton">
        {columns.map((col) => (
          <td key={col.key} className="data-table__td">
            <div className="data-table__skeleton-line" style={{ width: col.width || '85%' }} />
          </td>
        ))}
      </tr>
    ));
  };

  const renderCardSkeleton = () => {
    return Array.from({ length: 4 }).map((_, idx) => (
      <div key={`skeleton-card-${idx}`} className="data-table-card data-table-card--skeleton">
        <div className="data-table-card__header">
          <div className="data-table__skeleton-line" style={{ width: '40%', height: '18px' }} />
          <div className="data-table__skeleton-line" style={{ width: '20%', height: '18px' }} />
        </div>
        <div className="data-table-card__details">
          <div className="data-table-card__field">
            <div className="data-table__skeleton-line" style={{ width: '30%' }} />
            <div className="data-table__skeleton-line" style={{ width: '50%' }} />
          </div>
          <div className="data-table-card__field">
            <div className="data-table__skeleton-line" style={{ width: '30%' }} />
            <div className="data-table__skeleton-line" style={{ width: '60%' }} />
          </div>
          <div className="data-table-card__field">
            <div className="data-table__skeleton-line" style={{ width: '30%' }} />
            <div className="data-table__skeleton-line" style={{ width: '40%' }} />
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="data-table-wrapper">
      {/* ── Card Title Bar ── */}
      {title && (
        <div className="data-table__title-bar">
          <h2 className="data-table__title">{title}</h2>
          {subtitle && <p className="data-table__subtitle">{subtitle}</p>}
        </div>
      )}

      {/* ── Toolbar Header ── */}
      <div className="data-table__toolbar">
        <div className="data-table__toolbar-left">
          {/* Entries Page Limit Selector */}
          <div className="data-table__entries-select-wrapper">
            <select
              className="data-table__limit-select"
              value={activeLimit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="data-table__entries-text">Entries Per Page</span>
          </div>

          {/* Render filters inside the left side toolbar */}
          {filters && <div className="data-table__filters-container">{filters}</div>}
        </div>

        <div className="data-table__toolbar-right">
          {/* Search Box */}
          {(onSearch || showSearch) && (
            <div className="data-table__search">
              <span className="data-table__search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                className="data-table__search-input"
                placeholder="Search here…"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchValue && (
                <button
                  type="button"
                  className="data-table__search-clear"
                  onClick={clearSearch}
                  title="Clear search"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          {/* Dynamic Table Utility Actions */}
          <div className="data-table__toolbar-actions">
            {/* XLSX Export Button — only for permitted modules */}
            {exportable && (
              <button
                type="button"
                className="data-table__toolbar-btn data-table__toolbar-btn--export"
                onClick={exportToXLSX}
                title="Export data to Excel (XLSX)"
              >
                <ExportIcon />
                <span>Export XLSX</span>
              </button>
            )}

            {/* Custom Parent Actions */}
            {actions}
          </div>
        </div>
      </div>

      {/* ── Table / Grid Render Engine ── */}
      {viewMode === 'table' ? (
        /* Standard Table Desktop View */
        <div className="data-table__scroll-wrapper">
          {showLeftShadow && <div className="data-table__scroll-shadow-left" />}
          {showRightShadow && <div className="data-table__scroll-shadow-right" />}
          <div className="data-table__scroll" ref={scrollContainerRef}>
            <table className="data-table">
              <thead className="data-table__head">
                <tr>
                  {columns.map((col) => {
                    const isSorted = sortKey === col.key;
                    const isActions = col.key === 'actions';
                    return (
                      <th
                        key={col.key}
                        className={`data-table__th ${col.sortable ? 'data-table__th--sortable' : ''} ${isSorted ? 'data-table__th--sorted' : ''} ${isActions ? 'data-table__th--actions' : ''}`}
                        style={col.width ? { width: col.width } : undefined}
                        onClick={col.sortable ? () => handleSortClick(col.key) : undefined}
                      >
                        <div className="data-table__th-content">
                          <span>{col.label}</span>
                          {col.sortable && (
                            <span className="data-table__sort-icon">
                              {isSorted ? (
                                sortOrder === 'asc' ? <SortUpIcon /> : <SortDownIcon />
                              ) : (
                                <SortIcon />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="data-table__body">
                {isLoading ? (
                  renderTableSkeleton()
                ) : displayData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="data-table__empty-cell">
                      <div className="data-table__empty">
                        <span className="data-table__empty-icon">
                          <EmptyIcon />
                        </span>
                        <p>{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayData.map((row, rowIdx) => {
                    const rowClass = getRowClassName ? getRowClassName(row) : '';
                    return (
                      <tr key={row._id || rowIdx} className={`data-table__row ${rowClass}`}>
                        {columns.map((col) => {
                          const isActions = col.key === 'actions';
                          return (
                            <td
                              key={col.key}
                              className={`data-table__td ${isActions ? 'data-table__td--actions' : ''}`}
                            >
                              {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Responsive Card List Mobile View */
        <div className="data-table-cards-container">
          {isLoading ? (
            <div className="data-table-cards-grid">{renderCardSkeleton()}</div>
          ) : displayData.length === 0 ? (
            <div className="data-table__empty-card">
              <span className="data-table__empty-icon">
                <EmptyIcon />
              </span>
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className="data-table-cards-grid">
              {displayData.map((row, rowIdx) => {
                // Determine layout column for title
                const titleCol = columns.find((c) => c.key !== 'actions') || columns[0];
                const actionCol = columns.find((c) => c.key === 'actions');

                return (
                  <div key={row._id || rowIdx} className="data-table-card">
                    {/* Card Title Header with optional actions */}
                    <div className="data-table-card__header">
                      <div className="data-table-card__title">
                        {titleCol.render ? titleCol.render(row[titleCol.key], row) : (row[titleCol.key] ?? '—')}
                      </div>
                      {actionCol && actionCol.render && (
                        <div className="data-table-card__actions">
                          {actionCol.render(row[actionCol.key], row)}
                        </div>
                      )}
                    </div>

                    {/* Card Fields Body */}
                    <div className="data-table-card__details">
                      {columns
                        .filter((col) => col.key !== titleCol.key && col.key !== 'actions')
                        .map((col) => (
                          <div key={col.key} className="data-table-card__field">
                            <span className="data-table-card__field-label">{col.label}:</span>
                            <span className="data-table-card__field-value">
                              {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Pagination Footer ── */}
      <div className="data-table__pagination">
        {/* Info label */}
        <div className="data-table__pagination-info">
          Showing {displayData.length === 0 ? 0 : (activePage - 1) * activeLimit + 1}–
          {Math.min(activePage * activeLimit, displayTotal).toLocaleString()} of {displayTotal.toLocaleString()} entries
        </div>

        {/* Quick jump pagination buttons */}
        <div className="data-table__pagination-pages">
          <button
            className="data-table__page-btn"
            disabled={activePage <= 1}
            onClick={() => handlePageChange(activePage - 1)}
            title="Previous Page"
          >
            <ChevronLeftIcon />
          </button>

          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="data-table__pagination-dots">
                  ...
                </span>
              );
            }
            return (
              <button
                key={p}
                className={`data-table__page-btn ${activePage === p ? 'data-table__page-btn--active' : ''}`}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </button>
            );
          })}

          <button
            className="data-table__page-btn"
            disabled={activePage >= totalPages}
            onClick={() => handlePageChange(activePage + 1)}
            title="Next Page"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
