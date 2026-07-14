import './StatusBadge.css';

const STATUS_CONFIG = {
  // Generic statuses
  active:        { label: 'Active',        className: 'badge--primary'  },
  inactive:      { label: 'Inactive',      className: 'badge--grey'     },
  // Production / orders
  draft:         { label: 'Draft',         className: 'badge--info'     },
  pending:       { label: 'Pending',       className: 'badge--warning'  },
  in_production: { label: 'In Production', className: 'badge--info'     },
  in_progress:   { label: 'In Progress',   className: 'badge--info'     },
  completed:     { label: 'Completed',     className: 'badge--success'  },
  cancelled:     { label: 'Cancelled',     className: 'badge--danger'   },
  // Sales / Dispatch
  sent:          { label: 'Sent',          className: 'badge--primary'  },
  accepted:      { label: 'Accepted',      className: 'badge--success'  },
  rejected:      { label: 'Rejected',      className: 'badge--danger'   },
  dispatched:    { label: 'Dispatched',    className: 'badge--warning'  },
  delivered:     { label: 'Delivered',     className: 'badge--success'  },
  // Payments
  paid:          { label: 'Paid',          className: 'badge--success'  },
  partial:       { label: 'Partial',       className: 'badge--warning'  },
  // Projects / Sites
  planned:       { label: 'Planned',       className: 'badge--info'     },
  on_hold:       { label: 'On Hold',       className: 'badge--warning'  },
  // Purchase
  requested:     { label: 'Requested',     className: 'badge--info'     },
  ordered:       { label: 'Ordered',       className: 'badge--warning'  },
  received:      { label: 'Received',      className: 'badge--success'  },
  // Inventory
  in_stock:      { label: 'In Stock',      className: 'badge--success'  },
  low_stock:     { label: 'Low Stock',     className: 'badge--warning'  },
  out_of_stock:  { label: 'Out of Stock',  className: 'badge--danger'   },
  // Users
  super_admin:   { label: 'Super Admin',   className: 'badge--primary'  },
  branch:        { label: 'Branch User',   className: 'badge--grey'     },
};

/**
 * StatusBadge — colored pastel pill for statuses across all modules.
 * Follows the design doc §3.5 status color mapping.
 */
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, className: 'badge--grey' };
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
