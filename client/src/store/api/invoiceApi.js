import { apiSlice } from '../../app/apiSlice';

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query({
      query: (params = {}) => ({ url: '/invoices', params }),
      providesTags: ['Invoice'],
    }),

    getInvoice: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }, 'Invoice'],
    }),

    createInvoice: builder.mutation({
      query: (body) => ({ url: '/invoices', method: 'POST', body }),
      invalidatesTags: ['Invoice', 'Customer'],
    }),

    updateInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Invoice', id }, 'Invoice'],
    }),

    cancelInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}/status`,
        method: 'PATCH',
        body: { status: 'cancelled' },
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Invoice', id }, 'Invoice', 'Customer'],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useCancelInvoiceMutation,
} = invoiceApi;
