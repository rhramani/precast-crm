import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from '../store/api/authApi';
import { useGetSettingsQuery } from '../store/api/settingsApi';
import defaultLogo from '../assets/logo.svg';
import { Mail, Lock, Key, Eye, EyeOff, ArrowLeft, Layers, Globe, BarChart2 } from 'lucide-react';
import loginBanner from '../assets/login_banner.png';
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
    <div className="login-container">
      {/* Left Showcase (Brand Visual) */}
      <div className="login-showcase" style={{ backgroundImage: `url(${loginBanner})` }}>
        <div className="login-showcase__image-overlay" />
        <div className="login-showcase__content">
          <div className="login-showcase__brand">
            {logo ? (
              <img src={logo} alt="Logo" className="login-showcase__brand-logo" />
            ) : (
              <img src={defaultLogo} alt="Logo" className="login-showcase__brand-logo" />
            )}
            <span className="login-showcase__brand-name">GIRPRECAST</span>
          </div>

          <div className="login-showcase__hero">
            <h1 className="login-showcase__title">Next-Gen Precast Operations Control</h1>
            <p className="login-showcase__description">
              Streamlining modular concrete production, inventory planning, multi-branch shipping, and logistics in one unified intelligence dashboard.
            </p>
          </div>

          <div className="login-showcase__features">
            <div className="login-showcase__feature-item">
              <div className="login-showcase__feature-icon-wrapper">
                <Layers size={20} />
              </div>
              <div className="login-showcase__feature-text">
                <h4 className="login-showcase__feature-title">Modular Production Control</h4>
                <p className="login-showcase__feature-desc">Track casting, curing cycles, and mold scheduling in real-time.</p>
              </div>
            </div>

            <div className="login-showcase__feature-item">
              <div className="login-showcase__feature-icon-wrapper">
                <Globe size={20} />
              </div>
              <div className="login-showcase__feature-text">
                <h4 className="login-showcase__feature-title">Multi-Branch Operations</h4>
                <p className="login-showcase__feature-desc">Synchronize inventory updates, transfer sheets, and raw material audits.</p>
              </div>
            </div>

            <div className="login-showcase__feature-item">
              <div className="login-showcase__feature-icon-wrapper">
                <BarChart2 size={20} />
              </div>
              <div className="login-showcase__feature-text">
                <h4 className="login-showcase__feature-title">Real-Time Analytics & Reports</h4>
                <p className="login-showcase__feature-desc">Access live manufacturing reports, cost evaluations, and client metrics.</p>
              </div>
            </div>
          </div>

          <div className="login-showcase__footer">
            <p>© {new Date().getFullYear()} GIR Precast. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="login-auth-panel">
        <div className="login-auth-card">
          
          {/* Mobile Only Logo Header */}
          <div className="login-auth-mobile-header">
            {logo ? (
              <img src={logo} alt="Logo" className="login-auth-mobile-logo" />
            ) : (
              <img src={defaultLogo} alt="Logo" className="login-auth-mobile-logo" />
            )}
            <h2 className="login-auth-mobile-title">GIRPRECAST</h2>
          </div>

          <div className="login-auth-header">
            <div className="login-auth-logo-badge">
              {logo ? (
                <img src={logo} alt="Logo" className="login-auth-logo-img" />
              ) : (
                <img src={defaultLogo} alt="Logo" className="login-auth-logo-img" />
              )}
            </div>
            <h2 className="login-auth-title">
              {view === 'login' && 'Welcome Back'}
              {view === 'forgot' && 'Reset Password'}
              {view === 'reset' && 'Create New Password'}
            </h2>
            <p className="login-auth-subtitle">
              {view === 'login' && 'Sign in to access your manufacturing workspace'}
              {view === 'forgot' && 'Enter your email to receive a verification OTP code'}
              {view === 'reset' && 'Verification successful! Set your new password below'}
            </p>
          </div>

          {/* Global Notifications */}
          {error && (
            <div className="login-error-alert" role="alert">
              <span className="login-error-alert__icon">⚠️</span>
              <span className="login-error-alert__message">{error}</span>
            </div>
          )}
          {success && (
            <div className="login-success-alert" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
              <span className="login-success-alert__icon">✓</span>
              <span className="login-success-alert__message">{success}</span>
            </div>
          )}

          {/* ── View: SIGN IN ── */}
          {view === 'login' && (
            <form className="login-form" onSubmit={handleLoginSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email address</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Mail size={18} />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input-pill"
                    placeholder="name@company.com"
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
                    <Lock size={18} />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input-pill"
                    placeholder="Enter password"
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
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Row */}
              <div className="login-options-row">
                <span
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setView('forgot');
                  }}
                  className="login-forgot-link"
                >
                  Forgot Password?
                </span>
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--full ${isLoginLoading ? 'btn--loading' : ''}`}
                disabled={isLoginLoading}
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
                <ArrowLeft size={16} /> Back to Login
              </button>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Mail size={18} />
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
                <ArrowLeft size={16} /> Back
              </button>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Mail size={18} />
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
                    <Key size={18} />
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
                    <Lock size={18} />
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
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Lock size={18} />
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
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--full ${isResetLoading ? 'btn--loading' : ''}`}
                disabled={isResetLoading}
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
    </div>
  );
};

export default Login;
