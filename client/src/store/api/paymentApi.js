import { apiSlice } from '../../app/apiSlice';

export const paymentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query({
      query: (params = {}) => ({ url: '/payments', params }),
      providesTags: ['Payment'],
    }),

    getPayment: builder.query({
      query: (id) => `/payments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payment', id }, 'Payment'],
    }),

    createPayment: builder.mutation({
      query: (body) => ({ url: '/payments', method: 'POST', body }),
      invalidatesTags: ['Payment', 'Invoice', 'Customer'],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetPaymentQuery,
  useCreatePaymentMutation,
} = paymentApi;
