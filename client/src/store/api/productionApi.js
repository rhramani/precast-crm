import { apiSlice } from '../../app/apiSlice';

export const productionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductionOrders: builder.query({
      query: (params = {}) => ({ url: '/production', params }),
      providesTags: ['Production'],
    }),

    getProductionOrder: builder.query({
      query: (id) => `/production/${id}`,
      providesTags: (result, error, id) => [{ type: 'Production', id }, 'Production'],
    }),

    createProductionOrder: builder.mutation({
      query: (body) => ({ url: '/production', method: 'POST', body }),
      invalidatesTags: ['Production'],
    }),

    updateProductionOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/production/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Production', id }, 'Production', 'Inventory'],
    }),

    completeProductionOrder: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/production/${id}/complete`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Production', id },
        'Production',
        'RawMaterial',
        'Inventory',
      ],
    }),

    calculateCapacity: builder.mutation({
      query: (body) => ({
        url: '/production/capacity-calculator',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetProductionOrdersQuery,
  useGetProductionOrderQuery,
  useCreateProductionOrderMutation,
  useUpdateProductionOrderStatusMutation,
  useCompleteProductionOrderMutation,
  useCalculateCapacityMutation,
} = productionApi;
