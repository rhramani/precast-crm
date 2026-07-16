import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, clearCredentials } from '../store/slices/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithBranch = async (args, api, extraOptions) => {
  let adjustedArgs = typeof args === 'string' ? { url: args } : { ...args };

  const state = api.getState();
  const currentBranch = state.branch?.currentBranch;

  // Auto-inject branchId for GET requests if a branch context is active in store
  if (
    currentBranch?._id &&
    (!adjustedArgs.method || adjustedArgs.method.toUpperCase() === 'GET')
  ) {
    adjustedArgs.params = {
      ...adjustedArgs.params,
      branchId: currentBranch._id,
    };
  }

  // Execute primary request
  let result = await rawBaseQuery(adjustedArgs, api, extraOptions);

  // If request fails with 401, attempt silent token refresh
  if (result.error && result.error.status === 401) {
    const currentState = api.getState();
    const refreshToken = currentState.auth?.refreshToken;
    const user = currentState.auth?.user;

    if (refreshToken) {
      try {
        const refreshResult = await rawBaseQuery(
          {
            url: '/auth/refresh-token',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data?.success && refreshResult.data?.data) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResult.data.data;

          // Store new tokens in local storage
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Update Redux state
          api.dispatch(
            setCredentials({
              user,
              token: newAccessToken,
              refreshToken: newRefreshToken,
            })
          );

          // Retry the original query
          result = await rawBaseQuery(adjustedArgs, api, extraOptions);
        } else {
          // Refresh failed - log out
          api.dispatch(clearCredentials());
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('loginTime');
        }
      } catch (err) {
        // Refresh failed - log out
        api.dispatch(clearCredentials());
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('loginTime');
      }
    } else {
      // No refresh token - log out
      api.dispatch(clearCredentials());
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('loginTime');
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithBranch,
  tagTypes: [
    'Auth',
    'Branch',
    'User',
    'RawMaterial',
    'Product',
    'BOM',
    'Production',
    'Inventory',
    'Customer',
    'Project',
    'Site',
    'Quotation',
    'Purchase',
    'Supplier',
    'Dispatch',
    'Installation',
    'Labour',
    'Expense',
    'Costing',
    'Report',
    'Notification',
    'Settings',
    'WallTemplate',
  ],
  endpoints: () => ({}),
});
