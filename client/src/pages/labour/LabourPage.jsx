import { useState, useEffect } from 'react';
import {
  useGetLabourersQuery,
  useCreateLabourMutation,
  useUpdateLabourMutation,
  useDeleteLabourMutation,
  useLogLabourAttendanceMutation,
  useGetLabourAttendanceQuery,
} from '../../store/api/labourApi';
import { useGetProjectsQuery } from '../../store/api/projectApi';
import DataTable from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import StatusBadge from '../../components/ui/StatusBadge';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import { Check, X } from 'lucide-react';

const LabourPage = () => {
  // Tabs state
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'attendance'

  // Labour list states (for Directory tab)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [filterSites, setFilterSites] = useState([]);

  // Attendance tab states & Weekly Helpers
  const formatLocalDate = (d) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getWeekDates = (startStr) => {
    const dates = [];
    const start = new Date(startStr);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const [weekStartDate, setWeekStartDate] = useState(() => {
    const mon = getMonday(new Date());
    return formatLocalDate(mon);
  });

  const weekDates = getWeekDates(weekStartDate);
  const weekEndDate = weekDates[6] ? formatLocalDate(weekDates[6]) : '';

  const [attProjectId, setAttProjectId] = useState('');
  const [attSiteId, setAttSiteId] = useState('');
  const [attSites, setAttSites] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});

  // Queries for Directory tab
  const { data, isLoading } = useGetLabourersQuery({
    page,
    limit,
    search,
    projectId: projectFilter,
    siteId: siteFilter
  });
  const labourers = data?.data?.labourers || [];

  // Queries for Attendance tab
  const { data: labourersData, isLoading: loadingLabourers } = useGetLabourersQuery({
    projectId: attProjectId,
    siteId: attSiteId,
    limit: 100
  }, { skip: activeTab !== 'attendance' || !attSiteId });
  const attLabourers = labourersData?.data?.labourers || [];

  const { data: attLogsRes, isLoading: loadingAttendance } = useGetLabourAttendanceQuery({
    startDate: weekStartDate,
    endDate: weekEndDate
  }, { skip: activeTab !== 'attendance' || !weekStartDate || !weekEndDate });
  const attendanceLogs = attLogsRes?.data?.attendance || [];

  const { data: projectsRes } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsRes?.data?.projects || [];

  const [createLabour] = useCreateLabourMutation();
  const [updateLabour] = useUpdateLabourMutation();
  const [deleteLabour] = useDeleteLabourMutation();
  const [logLabourAttendance, { isLoading: isSaving }] = useLogLabourAttendanceMutation();

  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  const handleDeleteLabour = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    try {
      await deleteLabour(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete labour.');
    }
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [form, setForm] = useState({
    labourName: '',
    mobileNumber: '',
    labourType: 'helper',
    dailyWages: 0,
    projectId: '',
    siteId: '',
  });
  const [projectSites, setProjectSites] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1';

  // Sync weekStartDate when selected site changes and site has startDate
  useEffect(() => {
    if (attSiteId && attSites && attSites.length > 0) {
      const selectedSite = attSites.find(s => s._id === attSiteId);
      if (selectedSite && selectedSite.startDate) {
        setWeekStartDate(formatLocalDate(selectedSite.startDate));
      }
    }
  }, [attSiteId, attSites]);

  const handleProjectFilterChange = async (projId) => {
    setProjectFilter(projId);
    setSiteFilter('');
    setPage(1);
    if (!projId) {
      setFilterSites([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (response.ok) {
        const resData = await response.json();
        setFilterSites(resData.data.sites || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAttProjectChange = async (projId) => {
    setAttProjectId(projId);
    setAttSiteId('');
    if (!projId) {
      setAttSites([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (response.ok) {
        const resData = await response.json();
        setAttSites(resData.data.sites || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAttendance = async () => {
    const records = Object.keys(attendanceMap).map((labourId) => ({
      labourId,
      status: attendanceMap[labourId].status,
      remarks: attendanceMap[labourId].remarks || '',
    }));

    try {
      await logLabourAttendance({ date: attendanceDate, records }).unwrap();
      alert('Daily Attendance logged successfully!');
    } catch (err) {
      alert(err?.data?.message || 'Failed to save daily attendance.');
    }
  };

  const handleProjectChange = async (projId) => {
    setForm((prev) => ({ ...prev, projectId: projId, siteId: '' }));
    if (!projId) {
      setProjectSites([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (response.ok) {
        const resData = await response.json();
        setProjectSites(resData.data.sites || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setSelectedLabour(null);
    setForm({
      labourName: '',
      mobileNumber: '',
      labourType: 'helper',
      dailyWages: 0,
      projectId: '',
      siteId: '',
    });
    setProjectSites([]);
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = async (labour) => {
    setSelectedLabour(labour);
    setForm({
      labourName: labour.labourName || '',
      mobileNumber: labour.mobileNumber || '',
      labourType: labour.labourType || 'helper',
      dailyWages: labour.dailyWages || 0,
      projectId: labour.projectId?._id || labour.projectId || '',
      siteId: labour.siteId?._id || labour.siteId || '',
    });
    setValidationErrors({});

    const projId = labour.projectId?._id || labour.projectId;
    if (projId) {
      try {
        const response = await fetch(`${API_BASE}/projects/${projId}/sites`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (response.ok) {
          const resData = await response.json();
          setProjectSites(resData.data.sites || []);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setProjectSites([]);
    }
    setDrawerOpen(true);
  };

  const handleStatusToggle = async (labour) => {
    const nextStatus = labour.status === 'active' ? 'inactive' : 'active';
    try {
      await updateLabour({ id: labour._id, status: nextStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to toggle status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.labourName.trim())   errors.labourName = 'Labour name is required';
    if (!form.mobileNumber.trim()) errors.mobileNumber = 'Mobile number is required';
    if (form.dailyWages < 0)       errors.dailyWages = 'Daily wage rate must be >= 0';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (selectedLabour) {
        await updateLabour({ id: selectedLabour._id, ...form }).unwrap();
      } else {
        await createLabour(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save operation failed.' });
    }
  };



  const columns = [
    { key: 'labourName', label: 'Labour Name', sortable: true },
    { key: 'labourType', label: 'Crew Type', render: (val) => val.toUpperCase().replace('_', ' ') },
    { key: 'mobileNumber', label: 'Mobile Number' },
    { key: 'projectId', label: 'Assigned Project', render: (val) => val?.projectName || '—' },
    { key: 'siteId', label: 'Assigned Site', render: (val) => val?.siteName || '—' },
    { key: 'dailyWages', label: 'Daily Wage Rate (₹)', render: (val) => `₹${val}/day` },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={val} />
          <button onClick={() => handleStatusToggle(row)} className="btn btn--secondary btn--sm" style={{ padding: '2px 6px', fontSize: '10px' }}>Toggle</button>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <ActionsDropdown
          actions={[
            { label: 'Edit Labour', onClick: () => handleOpenEdit(row), type: 'primary' },
            { divider: true },
            { label: 'Delete', onClick: () => handleDeleteLabour(row._id), type: 'danger' }
          ]}
        />
      ),
    },
  ];

  const statusOptions = [
    { value: 'present', label: 'Present', color: '#10b981' },
    { value: 'absent', label: 'Absent', color: '#ef4444' },
    { value: 'half_day', label: 'Half Day', color: '#f59e0b' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Tabs Selector ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '8px' }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--color-bg-card)',
          padding: '4px',
          borderRadius: '30px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '8px 24px',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '26px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'directory' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'directory' ? '#fff' : 'var(--color-text-secondary)',
              boxShadow: activeTab === 'directory' ? '0 4px 10px rgba(99, 102, 241, 0.25)' : 'none',
              minHeight: '36px'
            }}
          >
            Labour Directory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '8px 24px',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '26px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'attendance' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'attendance' ? '#fff' : 'var(--color-text-secondary)',
              boxShadow: activeTab === 'attendance' ? '0 4px 10px rgba(99, 102, 241, 0.25)' : 'none',
              minHeight: '36px'
            }}
          >
            Daily Attendance Log
          </button>
        </div>
      </div>

      {activeTab === 'directory' ? (
        <>
          {/* ── Filter Bar ── */}
          <div className="glass-card" style={{
            display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '20px',
            borderLeft: '4px solid var(--color-primary)'
          }}>
            <div className="field-group" style={{ flex: '1 1 200px', margin: 0 }}>
              <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Filter by Project</label>
              <select
                className="field-select"
                value={projectFilter}
                onChange={(e) => handleProjectFilterChange(e.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.projectName}</option>
                ))}
              </select>
            </div>

            <div className="field-group" style={{ flex: '1 1 200px', margin: 0 }}>
              <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Filter by Site</label>
              <select
                className="field-select"
                value={siteFilter}
                disabled={!projectFilter}
                onChange={(e) => {
                  setSiteFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Sites</option>
                {filterSites.map((s) => (
                  <option key={s._id} value={s._id}>{s.siteName}</option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            title="Labour Profiles Directory"
            columns={columns}
            data={labourers}
            total={data?.meta?.total || 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onSearch={setSearch}
            isLoading={isLoading}
            actions={
              <button onClick={handleOpenAdd} className="btn btn--primary" style={{ borderRadius: '24px', padding: '8px 20px' }}>
                + Add Labour Profile
              </button>
            }
          />
        </>
      ) : (
        <>
          {/* ── Attendance Header & Navigation ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: 0 }}>Attendance</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {(() => {
                  if (weekDates.length === 0) return '';
                  const start = weekDates[0];
                  const end = weekDates[6];
                  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
                  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
                  return `${startMonth} ${start.getDate()} - ${startMonth === endMonth ? '' : endMonth + ' '}${end.getDate()}`;
                })()}
              </span>
              
              <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(weekStartDate);
                    d.setDate(d.getDate() - 7);
                    setWeekStartDate(formatLocalDate(d));
                  }}
                  className="btn btn--secondary btn--sm"
                  style={{ minHeight: '28px', padding: '0 12px', fontSize: '12px', fontWeight: 700 }}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStartDate(formatLocalDate(getMonday(new Date())))}
                  className="btn btn--secondary btn--sm"
                  style={{ minHeight: '28px', padding: '0 12px', fontSize: '11px', fontWeight: 700 }}
                >
                  Current Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(weekStartDate);
                    d.setDate(d.getDate() + 7);
                    setWeekStartDate(formatLocalDate(d));
                  }}
                  className="btn btn--secondary btn--sm"
                  style={{ minHeight: '28px', padding: '0 12px', fontSize: '12px', fontWeight: 700 }}
                >
                  &gt;
                </button>
              </div>

              {isSaving && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Saving...
                </span>
              )}
            </div>
          </div>

          {/* ── Attendance Config/Filters Bar ── */}
          <div className="glass-card" style={{
            display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '20px',
            borderLeft: '4px solid var(--color-primary)'
          }}>
            <div className="field-group" style={{ flex: '1 1 180px', margin: 0 }}>
              <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Start Date</label>
              <input
                type="date"
                className="field-input"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ flex: '1 1 180px', margin: 0 }}>
              <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>End Date</label>
              <input
                type="date"
                className="field-input"
                value={weekEndDate}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            <div className="field-group" style={{ flex: '1 1 220px', margin: 0 }}>
              <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Select Project</label>
              <select
                className="field-select"
                value={attProjectId}
                onChange={(e) => handleAttProjectChange(e.target.value)}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.projectName}</option>
                ))}
              </select>
            </div>

            <div className="field-group" style={{ flex: '1 1 220px', margin: 0 }}>
              <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Select Site</label>
              <select
                className="field-select"
                value={attSiteId}
                disabled={!attProjectId}
                onChange={(e) => setAttSiteId(e.target.value)}
              >
                <option value="">Select Site</option>
                {attSites.map((s) => (
                  <option key={s._id} value={s._id}>{s.siteName}</option>
                ))}
              </select>
            </div>
          </div>

          {!attSiteId ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--color-bg-card)', border: '1px dashed var(--color-border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
              <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '14px' }}>Please select a Project and Site above to load the weekly attendance sheet.</p>
            </div>
          ) : loadingLabourers || loadingAttendance ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Loading attendance grid...</p>
            </div>
          ) : attLabourers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--color-bg-card)', border: '1px dashed var(--color-border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
              <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '14px' }}>No labourers are assigned to this site.</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '4px' }}>Go to the **Labour Directory** tab to allocate workers to this site first.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table__table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>Labourer</th>
                      
                      {weekDates.map((date) => {
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                        const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const isCurrentToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <th key={date.toDateString()} style={{ padding: '12px 16px', textAlign: 'center', width: '110px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isCurrentToday ? 'var(--color-primary)' : 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                              {isCurrentToday ? 'TODAY' : dayName}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, marginTop: '2px' }}>
                              {dateStr.split('/')[0]}/{dateStr.split('/')[1]}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {attLabourers.map((lab) => {
                      return (
                        <tr key={lab._id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{lab.labourName}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              {lab.labourType.toUpperCase().replace('_', ' ')} • ₹{lab.dailyWages}/day
                            </div>
                          </td>

                          {weekDates.map((date) => {
                            const dateStr = date.toISOString().split('T')[0];
                            
                            // Find log for this labourId and dateStr
                            const log = attendanceLogs.find((l) => {
                              const logLabId = l.labourId?._id || l.labourId;
                              const logDateStr = new Date(l.date).toISOString().split('T')[0];
                              return logLabId === lab._id && logDateStr === dateStr;
                            });

                            const status = log ? log.status : null;
                            const isPresent = status === 'present';
                            const isAbsent = status === 'absent';

                            const handleCellClick = async (labourId, dayDateStr, actionStatus) => {
                              try {
                                await logLabourAttendance({
                                  date: dayDateStr,
                                  projectId: attProjectId,
                                  siteId: attSiteId,
                                  records: [{ labourId, status: actionStatus }]
                                }).unwrap();
                              } catch (err) {
                                alert(err?.data?.message || 'Failed to update attendance.');
                              }
                            };

                            return (
                              <td key={dateStr} style={{ padding: '14px 8px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  {/* Check Circle */}
                                  <button
                                    type="button"
                                    onClick={() => handleCellClick(lab._id, dateStr, 'present')}
                                    title="Mark Present"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                      border: isPresent ? 'none' : '1.5px solid var(--color-border)',
                                      background: isPresent ? '#10b981' : 'transparent',
                                      color: isPresent ? '#fff' : 'var(--color-text-muted)',
                                      boxShadow: isPresent ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                                      minHeight: '28px'
                                    }}
                                  >
                                    <Check size={13} strokeWidth={3} />
                                  </button>

                                  {/* Cross Circle */}
                                  <button
                                    type="button"
                                    onClick={() => handleCellClick(lab._id, dateStr, 'absent')}
                                    title="Mark Absent"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                      border: isAbsent ? 'none' : '1.5px solid var(--color-border)',
                                      background: isAbsent ? '#ef4444' : 'transparent',
                                      color: isAbsent ? '#fff' : 'var(--color-text-muted)',
                                      boxShadow: isAbsent ? '0 2px 6px rgba(239, 68, 68, 0.3)' : 'none',
                                      minHeight: '28px'
                                    }}
                                  >
                                    <X size={13} strokeWidth={3} />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Legend Section ── */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '24px',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '16px',
                marginTop: '10px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#fff' }}>
                    <Check size={11} strokeWidth={3} />
                  </div>
                  Present
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ef4444', color: '#fff' }}>
                    <X size={11} strokeWidth={3} />
                  </div>
                  Absent
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <Check size={11} strokeWidth={3} />
                  </div>
                  Not Marked
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedLabour ? 'Edit Labour Profile' : 'Add Labour Profile'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn--primary">Save</button>
          </>
        }
      >
        {validationErrors.general && <div className="field-error">{validationErrors.general}</div>}

        <div className="field-group">
          <label className="field-label field-label--required">Labour Name</label>
          <input
            type="text"
            className="field-input"
            value={form.labourName}
            onChange={(e) => setForm({ ...form, labourName: e.target.value })}
            placeholder="e.g. Ramesh Pujari"
          />
          {validationErrors.labourName && <span className="field-error">{validationErrors.labourName}</span>}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label field-label--required">Mobile Number</label>
            <PhoneInput
              placeholder="Enter mobile number"
              value={form.mobileNumber}
              onChange={(val) => setForm({ ...form, mobileNumber: val || '' })}
              defaultCountry="IN"
            />
            {validationErrors.mobileNumber && <span className="field-error">{validationErrors.mobileNumber}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Crew Type</label>
            <select
              className="field-select"
              value={form.labourType}
              onChange={(e) => setForm({ ...form, labourType: e.target.value })}
            >
              <option value="mason">Mason</option>
              <option value="bar_bender">Bar Bender</option>
              <option value="carpenter">Carpenter</option>
              <option value="helper">Helper</option>
              <option value="operator">Operator</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label className="field-label">Daily Wage Rate (₹)</label>
            <input
              type="number"
              className="field-input"
              value={form.dailyWages}
              onChange={(e) => setForm({ ...form, dailyWages: Number(e.target.value) })}
            />
            {validationErrors.dailyWages && <span className="field-error">{validationErrors.dailyWages}</span>}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '20px' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary-dark)', margin: '0 0 16px 0' }}>
            Site Allocation (Optional)
          </p>

          <div className="form-row">
            <div className="field-group">
              <label className="field-label">Assign to Project</label>
              <select
                className="field-select"
                value={form.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                <option value="">Unassigned</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.projectName}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Assign to Site</label>
              <select
                className="field-select"
                value={form.siteId}
                disabled={!form.projectId}
                onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {projectSites.map((s) => (
                  <option key={s._id} value={s._id}>{s.siteName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </FormDrawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Labour Profile"
        message="Are you sure you want to delete this labourer? All daily attendance records for this labourer will be lost."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default LabourPage;
