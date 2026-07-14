import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentRole } from '../store/slices/authSlice';
import { useUpdateProfileMutation } from '../store/api/authApi';
import './ProfilePage.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const ProfilePage = () => {
  const user = useSelector(selectCurrentUser);
  const role = useSelector(selectCurrentRole);
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    mobileNumber: '',
    address: '',
    gstNumber: '',
    contactPerson: '',
    password: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hydrate form with user profile on load
  useEffect(() => {
    if (user) {
      setForm({
        name:          user.name || '',
        email:         user.email || '',
        mobile:        user.mobile || '',
        mobileNumber:  user.mobileNumber || '',
        address:       user.address || '',
        gstNumber:     user.gstNumber || '',
        contactPerson: user.contactPerson || '',
        password:      '',
        confirmPassword: '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (validationErrors[e.target.name]) {
      setValidationErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    setSuccessMessage('');

    const errors = {};
    if (!form.name.trim()) {
      errors.name = role === 'branch' ? 'Branch name is required' : 'Name is required';
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    }
    if (form.password) {
      if (form.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Build payload contextually based on user role
    const payload = {
      name:  form.name,
      email: form.email,
    };

    if (role === 'branch') {
      payload.mobileNumber = form.mobileNumber;
      payload.address = form.address;
      payload.gstNumber = form.gstNumber;
      payload.contactPerson = form.contactPerson;
    } else {
      payload.mobile = form.mobile;
    }

    if (form.password) {
      payload.password = form.password;
    }

    try {
      await updateProfile(payload).unwrap();
      setSuccessMessage('🎉 Profile updated successfully!');
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      if (err?.data?.errors) {
        const backendErrors = {};
        err.data.errors.forEach((msg) => {
          if (msg.includes('email')) backendErrors.email = msg;
          else if (msg.includes('password')) backendErrors.password = msg;
          else backendErrors.general = msg;
        });
        setValidationErrors(backendErrors);
      } else {
        setValidationErrors({ general: err?.data?.message || 'Failed to update profile.' });
      }
    }
  };

  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <div className="profile-card-header">
          <h2 className="profile-card-title">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="profile-card-icon">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile Settings
          </h2>
        </div>

        {successMessage && (
          <div className="profile-alert profile-alert--success">
            {successMessage}
          </div>
        )}

        {validationErrors.general && (
          <div className="profile-alert profile-alert--danger">
            {validationErrors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="field-group">
            <label className="field-label field-label--required">
              {role === 'branch' ? 'Branch Name' : 'Full Name'}
            </label>
            <input
              name="name"
              type="text"
              className="field-input"
              value={form.name}
              onChange={handleChange}
            />
            {validationErrors.name && (
              <span className="field-error">{validationErrors.name}</span>
            )}
          </div>

          <div className="field-group">
            <label className="field-label field-label--required">Email Address</label>
            <input
              name="email"
              type="email"
              className="field-input"
              value={form.email}
              onChange={handleChange}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          {role === 'branch' ? (
            <>
              <div className="profile-form-row">
                <div className="field-group">
                  <label className="field-label">Contact Person</label>
                  <input
                    name="contactPerson"
                    type="text"
                    className="field-input"
                    value={form.contactPerson}
                    onChange={handleChange}
                    placeholder="Representative name"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Mobile Number</label>
                  <PhoneInput
                    placeholder="Enter mobile number"
                    value={form.mobileNumber}
                    onChange={(val) => setForm({ ...form, mobileNumber: val || '' })}
                    defaultCountry="IN"
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">GSTIN (GST Number)</label>
                <input
                  name="gstNumber"
                  type="text"
                  className="field-input"
                  value={form.gstNumber}
                  onChange={handleChange}
                  placeholder="15-digit GSTIN"
                />
              </div>

              <div className="field-group">
                <label className="field-label">Address</label>
                <textarea
                  name="address"
                  className="field-textarea"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Complete factory address"
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div className="field-group">
              <label className="field-label">Mobile Number</label>
              <PhoneInput
                placeholder="Enter mobile number"
                value={form.mobile}
                onChange={(val) => setForm({ ...form, mobile: val || '' })}
                defaultCountry="IN"
              />
            </div>
          )}

          <hr className="profile-divider" />
          
          <h3 className="profile-section-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="profile-card-icon">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Reset Password
          </h3>
          <p className="profile-section-desc">
            Leave blank if you do not want to change your password.
          </p>

          <div className="profile-form-row">
            <div className="field-group">
              <label className="field-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="field-input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showNewPassword ? (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 16, height: 16 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 16, height: 16 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <span className="field-error">{validationErrors.password}</span>
              )}
            </div>
            <div className="field-group">
              <label className="field-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="field-input"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 16, height: 16 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 16, height: 16 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <span className="field-error">{validationErrors.confirmPassword}</span>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <button
              type="submit"
              className="btn btn--primary profile-submit-btn"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
