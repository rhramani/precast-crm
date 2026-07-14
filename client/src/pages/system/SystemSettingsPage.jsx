import { useState, useEffect } from 'react';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../store/api/settingsApi';
import './SystemSettingsPage.css';

const SystemSettingsPage = () => {
  const { data: settingsRes, isLoading: isFetching } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateSettingsMutation();

  const companyName = 'GIR Precast';
  const fontFamily = 'Inter';
  const [logo, setLogo] = useState('');
  const [favicon, setFavicon] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (settingsRes?.data) {
      setLogo(settingsRes.data.logo || '');
      setFavicon(settingsRes.data.favicon || '');
    }
  }, [settingsRes]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size limit check: 1.5MB
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Logo file size must be less than 1.5MB.');
      setMessage(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result); // Base64 Data URL
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read logo image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogo('');
  };

  const handleFaviconUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size limit check: 500KB
    if (file.size > 500 * 1024) {
      setError('Favicon file size must be less than 500KB.');
      setMessage(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFavicon(reader.result); // Base64 Data URL
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read favicon file.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearFavicon = () => {
    setFavicon('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      await updateSettings({ companyName, logo, favicon, fontFamily }).unwrap();
      setMessage('Branding settings updated successfully!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err?.data?.message || 'Failed to update system settings.');
    }
  };

  if (isFetching) {
    return (
      <div className="system-settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading configuration settings...</p>
      </div>
    );
  }

  return (
    <div className="system-settings-page animate-fade-in">
      <div className="system-settings-content">
        <form className="system-settings-card" onSubmit={handleSubmit}>
          <h2 className="card-section-title">Branding & Layout Configuration</h2>
          <p className="card-section-desc">Customize how the GIR Precast branding appears on the login screen, sidebar, and page layouts.</p>

          {message && (
            <div className="settings-alert alert-success animate-slide-in">
              <span>✨ {message}</span>
            </div>
          )}

          {error && (
            <div className="settings-alert alert-danger animate-slide-in">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="settings-fields">
            {/* Logo upload field */}
            <div className="field-group">
              <label className="field-label">Company Logo</label>
              
              <div className="logo-upload-container">
                <div className="logo-preview-box">
                  {logo ? (
                    <img src={logo} alt="Company Logo Preview" className="logo-preview-image" />
                  ) : (
                    <div className="logo-preview-placeholder">
                      <span className="placeholder-icon">⬡</span>
                      <span className="placeholder-text">No Custom Logo</span>
                    </div>
                  )}
                </div>

                <div className="logo-upload-controls">
                  <p className="upload-requirements">Recommended format: SVG, PNG or JPEG. Size: max 1.5MB. Best fits aspect ratio square or wide (e.g. 1:1 or 2:1).</p>
                  <div className="upload-btn-group">
                    <label className="btn btn--primary btn--sm file-upload-label">
                      Choose Logo File
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        style={{ display: 'none' }}
                      />
                    </label>
                    {logo && (
                      <button 
                        type="button" 
                        className="btn btn--secondary btn--sm" 
                        onClick={handleClearLogo}
                      >
                        Reset Default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Favicon upload field */}
            <div className="field-group">
              <label className="field-label">Browser Favicon</label>
              
              <div className="logo-upload-container">
                <div className="logo-preview-box" style={{ width: '56px', height: '56px', borderRadius: '8px' }}>
                  {favicon ? (
                    <img src={favicon} alt="Favicon Preview" className="logo-preview-image" style={{ padding: '6px' }} />
                  ) : (
                    <div className="logo-preview-placeholder">
                      <span className="placeholder-icon" style={{ fontSize: '1.2rem' }}>⬡</span>
                      <span className="placeholder-text" style={{ fontSize: '7px' }}>No Favicon</span>
                    </div>
                  )}
                </div>

                <div className="logo-upload-controls">
                  <p className="upload-requirements">Recommended format: ICO, PNG or WebP. Size: max 500KB. Best fits square aspect ratio (1:1, e.g. 32x32px).</p>
                  <div className="upload-btn-group">
                    <label className="btn btn--primary btn--sm file-upload-label">
                      Choose Favicon File
                      <input 
                        type="file" 
                        accept="image/x-icon,image/png,image/jpeg,image/webp" 
                        onChange={handleFaviconUpload} 
                        style={{ display: 'none' }}
                      />
                    </label>
                    {favicon && (
                      <button 
                        type="button" 
                        className="btn btn--secondary btn--sm" 
                        onClick={handleClearFavicon}
                      >
                        Reset Default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-form-actions">
            <button
              type="submit"
              className={`btn btn--primary ${isUpdating ? 'btn--loading' : ''}`}
              disabled={isUpdating}
            >
              {isUpdating ? <span className="btn__spinner" /> : 'Save System Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
