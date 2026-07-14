import { createSlice } from '@reduxjs/toolkit';

// Rehydrate token from localStorage on page reload
const getInitialState = () => {
  const loginTime = localStorage.getItem('loginTime');
  const isExpired = loginTime ? (Date.now() - parseInt(loginTime, 10)) > 24 * 60 * 60 * 1000 : false;

  if (isExpired) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('loginTime');
  }

  const storedToken = isExpired ? null : localStorage.getItem('accessToken');
  const storedRefreshToken = isExpired ? null : localStorage.getItem('refreshToken');

  return {
    user: null,
    token: storedToken || null,
    refreshToken: storedRefreshToken || null,
    role: null,
    branchId: null,
    permissions: [],
    isAuthenticated: !!storedToken,
  };
};

const initialState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token, refreshToken } = action.payload;
      state.user          = user;
      state.token         = token;
      state.refreshToken  = refreshToken;
      state.role          = user.role;
      state.branchId      = user.branchId;
      state.permissions   = user.permissions || [];
      state.isAuthenticated = true;
    },
    // Called by getMe query to hydrate user data after page reload
    setUser: (state, action) => {
      const user = action.payload;
      state.user          = user;
      state.role          = user.role;
      state.branchId      = user.branchId;
      state.permissions   = user.permissions || [];
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.user           = null;
      state.token          = null;
      state.refreshToken   = null;
      state.role           = null;
      state.branchId       = null;
      state.permissions    = [];
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setUser, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser      = (state) => state.auth.user;
export const selectCurrentToken     = (state) => state.auth.token;
export const selectCurrentRole      = (state) => state.auth.role;
export const selectCurrentBranchId  = (state) => state.auth.branchId;
export const selectIsAuthenticated  = (state) => state.auth.isAuthenticated;
export const selectPermissions      = (state) => state.auth.permissions;
