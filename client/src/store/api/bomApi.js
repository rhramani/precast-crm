import { apiSlice } from '../../app/apiSlice';

export const bomApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getActiveBom: builder.query({
      query: (productId) => `/bom/product/${productId}`,
      providesTags: (result, error, productId) => [{ type: 'BOM', id: `active-${productId}` }, 'BOM'],
    }),

    getBomHistory: builder.query({
      query: (productId) => `/bom/${productId}/history`,
      providesTags: (result, error, productId) => [{ type: 'BOM', id: `history-${productId}` }, 'BOM'],
    }),

    createBom: builder.mutation({
      query: (body) => ({ url: '/bom', method: 'POST', body }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'BOM', id: `active-${productId}` },
        { type: 'BOM', id: `history-${productId}` },
        'BOM',
      ],
    }),

    updateBom: builder.mutation({
      query: ({ id, productId, ...body }) => ({ url: `/bom/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'BOM', id: `active-${productId}` },
        { type: 'BOM', id: `history-${productId}` },
        'BOM',
      ],
    }),

    calculateBomCost: builder.mutation({
      query: (id) => ({ url: `/bom/${id}/calculate-cost`, method: 'POST' }),
      invalidatesTags: ['BOM'],
    }),

    calculateRawCost: builder.mutation({
      query: (body) => ({ url: '/bom/calculate-raw-cost', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetActiveBomQuery,
  useGetBomHistoryQuery,
  useCreateBomMutation,
  useUpdateBomMutation,
  useCalculateBomCostMutation,
  useCalculateRawCostMutation,
} = bomApi;
