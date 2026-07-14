import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetInstallationQuery,
  useUpdateInstallationMutation,
  useUpdateInstallationStatusMutation,
} from '../../store/api/installationApi';
import StatusBadge from '../../components/ui/StatusBadge';

const InstallationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: installRes, isLoading, error } = useGetInstallationQuery(id);
  const installData = installRes?.data?.installation;

  const [updateInstallation, { isLoading: isUpdating }] = useUpdateInstallationMutation();
  const [updateStatus, { isLoading: isStatusChanging }] = useUpdateInstallationStatusMutation();

  const [teamSize, setTeamSize] = useState('');
  const [labourCount, setLabourCount] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Sync state when data loads
  const handleEditOpen = () => {
    if (installData) {
      setTeamSize(installData.teamSize || 0);
      setLabourCount(installData.labourCount || 0);
      setEditMode(true);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading site installation records...</div>;
  }

  if (error || !installData) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
        ⚠️ Failed to load installation details.
        <br />
        <button onClick={() => navigate('/installation')} className="btn btn--secondary" style={{ marginTop: '16px' }}>
          Back to Installations
        </button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to transition this installation status to ${newStatus}?`)) {
      return;
    }
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Status transition failed');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateInstallation({
        id,
        teamSize: Number(teamSize),
        labourCount: Number(labourCount),
      }).unwrap();
      setEditMode(false);
    } catch (err) {
      alert(err?.data?.message || 'Update failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px 24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <button onClick={() => navigate('/installation')} className="btn btn--secondary">
          ← Back to Logs
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {installData.status === 'planned' && (
            <button onClick={() => handleStatusChange('in_progress')} className="btn btn--primary" disabled={isStatusChanging}>
              ⚡ Start Execution
            </button>
          )}
          {installData.status === 'in_progress' && (
            <button onClick={() => handleStatusChange('completed')} className="btn btn--success" disabled={isStatusChanging}>
              ✓ Complete Installation
            </button>
          )}
          {installData.status !== 'completed' && !editMode && (
            <button onClick={handleEditOpen} className="btn btn--secondary">
              ✏️ Edit Crew Specs
            </button>
          )}
        </div>
      </div>

      {/* Main Details Sheet */}
      <div className="card" style={{ background: 'var(--color-surface)', padding: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
        
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-border)', paddingBottom: '24px' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '1px' }}>Site Installation Order</span>
            <h1 style={{ fontSize: 'var(--text-2xl)', margin: '4px 0 0 0', fontWeight: 'var(--font-bold)' }}>{installData.installNumber}</h1>
            <div style={{ marginTop: '12px' }}>
              <StatusBadge status={installData.status} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>PRECAST CRM</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', margin: '4px 0 0 0' }}>
              Field Operations Department
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
          {/* Customer / Project / Site */}
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Project Erection Site</span>
            <strong>Project: {installData.projectId?.projectName}</strong>
            <div style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              Site: <strong>{installData.siteId?.siteName}</strong>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Address: {installData.siteId?.siteAddress || 'N/A'}
            </div>
          </div>

          {/* Dates & Logistics */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Execution Crew Specs</span>
            {editMode ? (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: 'var(--text-xs)' }}>Team Size:</label>
                  <input
                    type="number"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: 'var(--text-xs)' }}>Labour Count:</label>
                  <input
                    type="number"
                    value={labourCount}
                    onChange={(e) => setLabourCount(e.target.value)}
                    style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setEditMode(false)} className="btn btn--secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>Cancel</button>
                  <button type="submit" className="btn btn--primary" style={{ padding: '2px 8px', fontSize: '11px' }} disabled={isUpdating}>Save</button>
                </div>
              </form>
            ) : (
              <div style={{ fontSize: 'var(--text-sm)' }}>
                <div>Team Size: <strong>{installData.teamSize || 0} members</strong></div>
                <div style={{ marginTop: '4px' }}>Labourers Assigned: <strong>{installData.labourCount || 0} workers</strong></div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                  Start Date: {installData.startDate ? new Date(installData.startDate).toLocaleDateString() : '—'} <br />
                  Completion Date: {installData.completedDate ? new Date(installData.completedDate).toLocaleDateString() : '—'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Materials Installed Table */}
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: 'var(--text-md)', marginBottom: '16px', fontWeight: 'var(--font-semibold)' }}>Erection / Placement Checklist</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 0', color: 'var(--color-text-secondary)' }}>Precast Component Name</th>
                <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Code</th>
                <th style={{ padding: '12px 0', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Quantity to Install</th>
              </tr>
            </thead>
            <tbody>
              {installData.itemsInstalled?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 0' }}>
                    <strong>{item.productId?.productName || 'Unknown Product'}</strong>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <code>{item.productId?.productCode || '—'}</code>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>
                    {item.quantity} {item.productId?.unit || 'pcs'}
                  </td>
                </tr>
              ))}
              {(!installData.itemsInstalled || installData.itemsInstalled.length === 0) && (
                <tr>
                  <td colSpan="3" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No erection items scheduled for this installation order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InstallationDetailPage;
