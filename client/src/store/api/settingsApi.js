import { apiSlice } from '../../app/apiSlice';

export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /settings
    getSettings: builder.query({
      query: () => '/settings',
      providesTags: ['Settings'],
    }),

    // PUT /settings
    updateSettings: builder.mutation({
      query: (body) => ({
        url: '/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = settingsApi;
