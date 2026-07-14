import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentToken, setUser, clearCredentials } from '../store/slices/authSlice';
import { setCurrentBranch } from '../store/slices/branchSlice';
import { useGetMeQuery } from '../store/api/authApi';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { useGetSettingsQuery } from '../store/api/settingsApi';

/**
 * AppInitializer — runs on app load when a stored token exists.
 * Calls /auth/me to hydrate the user object into the Redux store.
 * This keeps the user logged in across page refreshes.
 */
const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const token = useSelector(selectCurrentToken);

  // Initialize notifications WebSockets connection
  useNotificationSocket();

  // Fetch dynamic branding settings
  const { data: settingsRes } = useGetSettingsQuery();

  // Synchronize document title, favicon, and SEO metatags dynamically
  useEffect(() => {
    if (settingsRes?.data) {
      const { companyName, favicon, fontFamily } = settingsRes.data;
      
      // Update font family dynamically
      if (fontFamily) {
        document.documentElement.style.setProperty(
          '--font-family',
          `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
        );
      } else {
        document.documentElement.style.removeProperty('--font-family');
      }

      if (companyName) {
        document.title = `${companyName} — Manufacturing Operations Platform`;
        
        // Helper to update head meta content
        const updateMeta = (selector, content) => {
          const el = document.querySelector(selector);
          if (el) el.setAttribute('content', content);
        };

        const desc = `${companyName} is a premium manufacturing operations and CRM platform for precast concrete manufacturers. Track branches, production orders, billing, and installations in real-time.`;
        
        updateMeta("meta[name='description']", desc);
        updateMeta("meta[property='og:title']", `${companyName} — Manufacturing Operations Platform`);
        updateMeta("meta[property='og:description']", desc);
        updateMeta("meta[property='og:site_name']", companyName);
        updateMeta("meta[name='twitter:title']", `${companyName} — Manufacturing Operations Platform`);
        updateMeta("meta[name='twitter:description']", desc);
      }
      if (favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = favicon;
      } else {
        // Fallback to default SVG favicon
        let link = document.querySelector("link[rel~='icon']");
        if (link) {
          link.href = '/favicon.svg';
        }
      }
    }
  }, [settingsRes]);

  const { data, isSuccess } = useGetMeQuery(undefined, {
    skip: !token, // Only run if a token exists in state
  });

  useEffect(() => {
    if (isSuccess && data?.data?.user) {
      const user = data.data.user;
      dispatch(setUser(user));
      if (user.role === 'branch') {
        dispatch(setCurrentBranch(user));
      }
    }
  }, [isSuccess, data, dispatch]);

  // Background check for 24-hour token expiry timeout
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = () => {
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime) {
        const timeElapsed = Date.now() - parseInt(loginTime, 10);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (timeElapsed >= twentyFourHours) {
          dispatch(clearCredentials());
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('loginTime');
        }
      }
    };

    // Run check initially
    checkTokenExpiry();

    // Run check every 10 seconds
    const interval = setInterval(checkTokenExpiry, 10000);

    return () => clearInterval(interval);
  }, [token, dispatch]);

  return children;
};

export default AppInitializer;
