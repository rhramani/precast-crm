import { apiSlice } from '../../app/apiSlice';

export const dispatchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDispatches: builder.query({
      query: (params = {}) => ({ url: '/dispatch', params }),
      providesTags: ['Dispatch'],
    }),

    getDispatch: builder.query({
      query: (id) => `/dispatch/${id}`,
      providesTags: (result, error, id) => [{ type: 'Dispatch', id }, 'Dispatch'],
    }),

    createDispatch: builder.mutation({
      query: (body) => ({ url: '/dispatch', method: 'POST', body }),
      invalidatesTags: ['Dispatch'],
    }),

    updateDispatch: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/dispatch/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Dispatch', id }, 'Dispatch'],
    }),

    confirmDispatch: builder.mutation({
      query: (id) => ({
        url: `/dispatch/${id}/dispatched`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Dispatch', id },
        'Dispatch',
        'FinishedGoods',
      ],
    }),

    confirmDelivery: builder.mutation({
      query: (id) => ({
        url: `/dispatch/${id}/delivered`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Dispatch', id }, 'Dispatch'],
    }),
  }),
});

export const {
  useGetDispatchesQuery,
  useGetDispatchQuery,
  useCreateDispatchMutation,
  useUpdateDispatchMutation,
  useConfirmDispatchMutation,
  useConfirmDeliveryMutation,
} = dispatchApi;
