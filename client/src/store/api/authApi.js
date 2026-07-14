import { apiSlice } from '../../app/apiSlice';
import { setCredentials, clearCredentials } from '../slices/authSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /auth/login
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const { user, accessToken, refreshToken } = data.data;
          // Persist to localStorage for page reload recovery
          localStorage.setItem('accessToken',  accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('loginTime', Date.now().toString());
          dispatch(setCredentials({ user, token: accessToken, refreshToken }));
        } catch {
          // Error handled by RTK Query
        }
      },
    }),

    // GET /auth/me
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),

    // POST /auth/refresh-token
    refreshToken: builder.mutation({
      query: (body) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body,
      }),
    }),

    // POST /auth/logout
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('loginTime');
          dispatch(clearCredentials());
          dispatch(apiSlice.util.resetApiState());
        }
      },
    }),

    // PUT /auth/profile
    updateProfile: builder.mutation({
      query: (body) => ({
        url: '/auth/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Auth'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const { user } = data.data;
          const currentToken = localStorage.getItem('accessToken');
          const currentRefresh = localStorage.getItem('refreshToken');
          dispatch(setCredentials({ user, token: currentToken, refreshToken: currentRefresh }));
        } catch {
          // Handled elsewhere
        }
      },
    }),

    // POST /auth/forgot-password
    forgotPassword: builder.mutation({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),

    // POST /auth/reset-password
    resetPassword: builder.mutation({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { 
  useLoginMutation, 
  useGetMeQuery, 
  useLogoutMutation, 
  useRefreshTokenMutation,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
