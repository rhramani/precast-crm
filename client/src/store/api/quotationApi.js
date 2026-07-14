import { apiSlice } from '../../app/apiSlice';

export const quotationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuotations: builder.query({
      query: (params = {}) => ({ url: '/quotations', params }),
      providesTags: ['Quotation'],
    }),

    getQuotation: builder.query({
      query: (id) => `/quotations/${id}`,
      providesTags: (result, error, id) => [{ type: 'Quotation', id }, 'Quotation'],
    }),

    createQuotation: builder.mutation({
      query: (body) => ({ url: '/quotations', method: 'POST', body }),
      invalidatesTags: ['Quotation'],
    }),

    updateQuotation: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Quotation', id }, 'Quotation'],
    }),

    updateQuotationStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/quotations/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Quotation', id }, 'Quotation'],
    }),

    deleteQuotation: builder.mutation({
      query: (id) => ({ url: `/quotations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Quotation'],
    }),
  }),
});

export const {
  useGetQuotationsQuery,
  useGetQuotationQuery,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useDeleteQuotationMutation,
} = quotationApi;
