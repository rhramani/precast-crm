import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentRole } from '../store/slices/authSlice';
import { useUpdateProfileMutation } from '../store/api/authApi';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import './ProfilePage.css';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input/max';
import 'react-phone-number-input/style.css';
import { restrictPhoneNumber } from '../utils/phoneUtils';

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
  const [profileMobileCountry, setProfileMobileCountry] = useState('IN');
  const [profileMobileNumberCountry, setProfileMobileNumberCountry] = useState('IN');
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
    if (role === 'branch') {
      if (form.mobileNumber && !isValidPhoneNumber(form.mobileNumber)) {
        errors.mobileNumber = 'Please enter a valid mobile number for the selected country';
      }
      if (form.gstNumber && form.gstNumber.trim().length !== 15) {
        errors.gstNumber = 'GSTIN must be exactly 15 characters';
      }
    } else {
      if (form.mobile && !isValidPhoneNumber(form.mobile)) {
        errors.mobile = 'Please enter a valid mobile number for the selected country';
      }
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
            <User size={22} strokeWidth={2.5} className="profile-card-icon" />
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
                    onChange={(val) => setForm({ ...form, mobileNumber: restrictPhoneNumber(val || '', profileMobileNumberCountry) })}
                    onCountryChange={setProfileMobileNumberCountry}
                    defaultCountry="IN"
                    international
                    limitMaxLength
                  />
                  {validationErrors.mobileNumber && <span className="field-error">{validationErrors.mobileNumber}</span>}
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">GSTIN (GST Number)</label>
                <input
                  name="gstNumber"
                  type="text"
                  className="field-input"
                  value={form.gstNumber}
                  onChange={(e) => {
                    setForm({ ...form, gstNumber: e.target.value.toUpperCase().replace(/\s/g, '') });
                    if (validationErrors.gstNumber) {
                      setValidationErrors({ ...validationErrors, gstNumber: '' });
                    }
                  }}
                  placeholder="15-digit GSTIN"
                  maxLength={15}
                />
                {validationErrors.gstNumber && <span className="field-error">{validationErrors.gstNumber}</span>}
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
                onChange={(val) => setForm({ ...form, mobile: restrictPhoneNumber(val || '', profileMobileCountry) })}
                onCountryChange={setProfileMobileCountry}
                defaultCountry="IN"
                international
                limitMaxLength
              />
              {validationErrors.mobile && <span className="field-error">{validationErrors.mobile}</span>}
            </div>
          )}

          <hr className="profile-divider" />
          
          <h3 className="profile-section-title">
            <Lock size={18} strokeWidth={2.5} className="profile-card-icon" />
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
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
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
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
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
