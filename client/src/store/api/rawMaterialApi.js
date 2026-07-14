import { apiSlice } from '../../app/apiSlice';

export const rawMaterialApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRawMaterials: builder.query({
      query: (params = {}) => ({ url: '/raw-materials', params }),
      providesTags: ['RawMaterial'],
    }),

    getRawMaterialLedger: builder.query({
      query: ({ id, params = {} }) => ({ url: `/raw-materials/${id}/ledger`, params }),
      providesTags: (result, error, { id }) => [{ type: 'RawMaterial', id: `${id}-ledger` }, 'RawMaterial'],
    }),

    createRawMaterial: builder.mutation({
      query: (body) => ({ url: '/raw-materials', method: 'POST', body }),
      invalidatesTags: ['RawMaterial'],
    }),

    updateRawMaterial: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/raw-materials/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'RawMaterial', id }, 'RawMaterial'],
    }),

    stockIn: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/raw-materials/${id}/stock-in`, method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'RawMaterial', id }, 'RawMaterial'],
    }),

    stockOut: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/raw-materials/${id}/stock-out`, method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'RawMaterial', id }, 'RawMaterial'],
    }),

    adjustStock: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/raw-materials/${id}/adjustment`, method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'RawMaterial', id }, 'RawMaterial'],
    }),

    transferStock: builder.mutation({
      query: (body) => ({ url: '/raw-materials/transfer', method: 'POST', body }),
      invalidatesTags: ['RawMaterial'],
    }),

    getLowStock: builder.query({
      query: () => '/raw-materials/low-stock',
      providesTags: ['RawMaterial'],
    }),

    deleteRawMaterial: builder.mutation({
      query: (id) => ({ url: `/raw-materials/${id}`, method: 'DELETE' }),
      invalidatesTags: ['RawMaterial'],
    }),
  }),
});

export const {
  useGetRawMaterialsQuery,
  useGetRawMaterialLedgerQuery,
  useCreateRawMaterialMutation,
  useUpdateRawMaterialMutation,
  useStockInMutation,
  useStockOutMutation,
  useAdjustStockMutation,
  useTransferStockMutation,
  useGetLowStockQuery,
  useDeleteRawMaterialMutation,
} = rawMaterialApi;
