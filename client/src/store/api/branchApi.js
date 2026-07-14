import { apiSlice } from '../../app/apiSlice';

export const branchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /branches
    getBranches: builder.query({
      query: (params = {}) => ({ url: '/branches', params }),
      providesTags: ['Branch'],
    }),

    // GET /branches/:id
    getBranch: builder.query({
      query: (id) => `/branches/${id}`,
      providesTags: (_, __, id) => [{ type: 'Branch', id }],
    }),

    // POST /branches
    createBranch: builder.mutation({
      query: (body) => ({ url: '/branches', method: 'POST', body }),
      invalidatesTags: ['Branch'],
    }),

    // PUT /branches/:id
    updateBranch: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/branches/${id}`, method: 'PUT', body }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Branch', id }, 'Branch'],
    }),

    // PATCH /branches/:id/status
    updateBranchStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/branches/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Branch'],
    }),

    // PATCH /branches/:id/subscription
    updateBranchSubscription: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/branches/${id}/subscription`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Branch', id }, 'Branch'],
    }),

    // DELETE /branches/:id
    deleteBranch: builder.mutation({
      query: (id) => ({ url: `/branches/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Branch'],
    }),
  }),
});

export const {
  useGetBranchesQuery,
  useGetBranchQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useUpdateBranchStatusMutation,
  useUpdateBranchSubscriptionMutation,
  useDeleteBranchMutation,
} = branchApi;
