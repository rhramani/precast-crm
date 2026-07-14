import { apiSlice } from '../../app/apiSlice';

export const installationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInstallations: builder.query({
      query: (params = {}) => ({ url: '/installation', params }),
      providesTags: ['Installation'],
    }),

    getInstallation: builder.query({
      query: (id) => `/installation/${id}`,
      providesTags: (result, error, id) => [{ type: 'Installation', id }, 'Installation'],
    }),

    createInstallation: builder.mutation({
      query: (body) => ({ url: '/installation', method: 'POST', body }),
      invalidatesTags: ['Installation'],
    }),

    updateInstallation: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/installation/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Installation', id }, 'Installation'],
    }),

    updateInstallationStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/installation/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Installation', id },
        'Installation',
        'Site',
      ],
    }),
  }),
});

export const {
  useGetInstallationsQuery,
  useGetInstallationQuery,
  useCreateInstallationMutation,
  useUpdateInstallationMutation,
  useUpdateInstallationStatusMutation,
} = installationApi;
