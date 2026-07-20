import { apiSlice } from '../../app/apiSlice';

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (params = {}) => ({ url: '/customers', params }),
      providesTags: ['Customer'],
    }),

    getDistance: builder.query({
      query: ({ origin, destination }) => ({
        url: '/customers/distance',
        params: { origin, destination },
      }),
    }),

    getCustomer: builder.query({
      query: (id) => `/customers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Customer', id }, 'Customer'],
    }),

    createCustomer: builder.mutation({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: ['Customer'],
    }),

    updateCustomer: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/customers/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Customer', id }, 'Customer'],
    }),

    getCustomerLedger: builder.query({
      query: (id) => `/customers/${id}/ledger`,
      providesTags: (result, error, id) => [{ type: 'Customer', id: `${id}-ledger` }],
    }),

    getCustomerOutstanding: builder.query({
      query: (id) => `/customers/${id}/outstanding`,
      providesTags: (result, error, id) => [{ type: 'Customer', id: `${id}-outstanding` }],
    }),

    deleteCustomer: builder.mutation({
      query: (id) => ({ url: `/customers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Customer'],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useGetCustomerLedgerQuery,
  useGetCustomerOutstandingQuery,
  useDeleteCustomerMutation,
  useGetDistanceQuery,
} = customerApi;
