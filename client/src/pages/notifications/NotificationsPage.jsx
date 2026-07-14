import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../store/api/notificationApi';
import StatusBadge from '../../components/ui/StatusBadge';

const NotificationsPage = () => {
  const { data, isLoading } = useGetNotificationsQuery();
  const notifications = data?.data?.notifications || [];

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const handleMarkRead = async (id) => {
    try {
      await markRead(id).unwrap();
    } catch (e) {
      alert('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
    } catch (e) {
      alert('Failed to clear notifications feed');
    }
  };

  // Helper styles based on type
  const getTypeStyles = (type) => {
    switch (type) {
      case 'low_stock':
        return { borderLeft: '4px solid var(--color-danger)', icon: '⚠️' };
      case 'quote_accepted':
        return { borderLeft: '4px solid var(--color-success)', icon: '📄' };
      case 'payment_received':
        return { borderLeft: '4px solid var(--color-accent)', icon: '💸' };
      case 'site_completed':
        return { borderLeft: '4px solid var(--color-success)', icon: '✅' };
      default:
        return { borderLeft: '4px solid var(--color-text-secondary)', icon: '🔔' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            In-App Notifications
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Real-time operating event feeds and system alerts.
          </p>
        </div>
        {notifications.filter((n) => !n.isRead).length > 0 && (
          <button onClick={handleMarkAllRead} className="btn btn--secondary">
            Clear all unread
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading notification feeds...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.length === 0 ? (
            <div className="card" style={{ background: 'var(--color-surface)', padding: '40px', textAlign: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '2rem' }}>🔔</span>
              <h3 style={{ margin: '16px 0 8px 0', color: 'var(--color-text-secondary)' }}>All caught up!</h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                No active notifications or alerts in your feed.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const styles = getTypeStyles(item.type);
              return (
                <div
                  key={item._id}
                  className="card"
                  style={{
                    background: item.isRead ? 'var(--color-surface)' : 'var(--color-background)',
                    opacity: item.isRead ? 0.75 : 1,
                    padding: '16px 20px',
                    border: '1px solid var(--color-border)',
                    ...styles,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{styles.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 'var(--text-sm)' }}>{item.title}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                      {!item.isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)' }} />}
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                      {item.message}
                    </p>
                  </div>
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkRead(item._id)}
                      className="btn btn--secondary btn--sm"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
