import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from '../store/api/authApi';
import { useGetSettingsQuery } from '../store/api/settingsApi';
import defaultLogo from '../assets/logo.svg';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [forgotPassword, { isLoading: isForgotLoading }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResetLoading }] = useResetPasswordMutation();
  const { data: settingsRes } = useGetSettingsQuery();

  // View States: 'login' | 'forgot' | 'reset'
  const [view, setView] = useState('login');

  // Input states
  const [form, setForm] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({ email: '', otp: '', newPassword: '', confirmNewPassword: '' });

  // Remember me checkbox
  const [rememberMe, setRememberMe] = useState(false);

  // Status states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const systemSettings = settingsRes?.data;
  const companyName = systemSettings?.companyName || 'GIR Precast';
  const logo = systemSettings?.logo || '';

  const handleLoginChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleResetChange = (e) => {
    setResetForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await login({ email: form.email, password: form.password }).unwrap();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!forgotEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    try {
      const res = await forgotPassword({ email: forgotEmail }).unwrap();
      setResetForm((prev) => ({ ...prev, email: forgotEmail }));
      setSuccess(`Reset OTP code sent! For testing, your OTP is: ${res.data?.otpCode}`);
      setView('reset');
    } catch (err) {
      setError(err?.data?.message || 'Failed to request password reset.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!resetForm.otp.trim()) {
      setError('Verification code is required');
      return;
    }
    if (resetForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }
    try {
      await resetPassword({
        email: resetForm.email,
        otp: resetForm.otp,
        newPassword: resetForm.newPassword,
      }).unwrap();
      setSuccess('Your password has been successfully reset! Please log in now.');
      setForm((prev) => ({ ...prev, email: resetForm.email, password: '' }));
      setView('login');
    } catch (err) {
      setError(err?.data?.message || 'Failed to reset password. Please check your OTP code.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-card__brand">
          {logo ? (
            <img src={logo} alt="Logo" className="login-card__brand-logo-img" />
          ) : (
            <img src={defaultLogo} alt="Logo" className="login-card__brand-logo-img" />
          )}
          <h1 className="login-card__title">{companyName}</h1>
          <p className="login-card__subtitle">Manufacturing Operations Platform</p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="login-error" role="alert">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="login-success" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
            {success}
          </div>
        )}

        {/* ── View: SIGN IN ── */}
        {view === 'login' && (
          <form className="login-form" onSubmit={handleLoginSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input-pill"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleLoginChange}
                  autoComplete="email"
                  required
                  disabled={isLoginLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input-pill"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleLoginChange}
                  autoComplete="current-password"
                  required
                  disabled={isLoginLoading}
                  style={{ paddingRight: '46px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-icon-right"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Options under fields */}
            <div className="login-options-row" style={{ justifyContent: 'flex-end' }}>
              <span
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setView('forgot');
                }}
                className="login-forgot-link"
              >
                Forgot Password
              </span>
            </div>

            <button
              type="submit"
              className={`btn btn--primary btn--full ${isLoginLoading ? 'btn--loading' : ''}`}
              disabled={isLoginLoading}
              style={{ padding: '14px 20px', marginTop: '12px' }}
            >
              {isLoginLoading ? (
                <span className="btn__spinner" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* ── View: FORGOT PASSWORD ── */}
        {view === 'forgot' && (
          <form className="login-form" onSubmit={handleForgotSubmit} noValidate>
            <button
              type="button"
              className="login-back-button"
              onClick={() => {
                setError('');
                setSuccess('');
                setView('login');
              }}
            >
              ← Back to Login
            </button>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  className="form-input-pill"
                  placeholder="Enter registered email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={isForgotLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`btn btn--primary btn--full ${isForgotLoading ? 'btn--loading' : ''}`}
              disabled={isForgotLoading}
              style={{ padding: '14px 20px', marginTop: '12px' }}
            >
              {isForgotLoading ? (
                <span className="btn__spinner" />
              ) : (
                'Send Verification OTP'
              )}
            </button>
          </form>
        )}

        {/* ── View: RESET PASSWORD ── */}
        {view === 'reset' && (
          <form className="login-form" onSubmit={handleResetSubmit} noValidate>
            <button
              type="button"
              className="login-back-button"
              onClick={() => {
                setError('');
                setSuccess('');
                setView('forgot');
              }}
            >
              ← Back
            </button>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  className="form-input-pill"
                  value={resetForm.email}
                  disabled
                  style={{ background: 'rgba(235, 235, 235, 0.7)', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Verification OTP</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                </span>
                <input
                  name="otp"
                  type="text"
                  className="form-input-pill"
                  placeholder="Enter 6-digit OTP code"
                  value={resetForm.otp}
                  onChange={handleResetChange}
                  required
                  disabled={isResetLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input-pill"
                  placeholder="New password (min 6 chars)"
                  value={resetForm.newPassword}
                  onChange={handleResetChange}
                  required
                  disabled={isResetLoading}
                  style={{ paddingRight: '46px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="input-icon-right"
                >
                  {showNewPassword ? (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  name="confirmNewPassword"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  className="form-input-pill"
                  placeholder="Retype password"
                  value={resetForm.confirmNewPassword}
                  onChange={handleResetChange}
                  required
                  disabled={isResetLoading}
                  style={{ paddingRight: '46px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="input-icon-right"
                >
                  {showConfirmNewPassword ? (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`btn btn--primary btn--full ${isResetLoading ? 'btn--loading' : ''}`}
              disabled={isResetLoading}
              style={{ padding: '14px 20px', marginTop: '12px' }}
            >
              {isResetLoading ? (
                <span className="btn__spinner" />
              ) : (
                'Save & Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
