import { apiSlice } from '../../app/apiSlice';

export const purchaseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: (params = {}) => ({ url: '/purchases/suppliers', params }),
      providesTags: ['Supplier'],
    }),

    createSupplier: builder.mutation({
      query: (body) => ({ url: '/purchases/suppliers', method: 'POST', body }),
      invalidatesTags: ['Supplier'],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/purchases/suppliers/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Supplier', id }, 'Supplier'],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({ url: `/purchases/suppliers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Supplier'],
    }),

    getPurchaseOrders: builder.query({
      query: (params = {}) => ({ url: '/purchases/orders', params }),
      providesTags: ['PurchaseOrder'],
    }),

    getPurchaseOrder: builder.query({
      query: (id) => `/purchases/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'PurchaseOrder', id }, 'PurchaseOrder'],
    }),

    createPurchaseOrder: builder.mutation({
      query: (body) => ({ url: '/purchases/orders', method: 'POST', body }),
      invalidatesTags: ['PurchaseOrder'],
    }),

    updatePurchaseOrder: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/purchases/orders/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'PurchaseOrder', id }, 'PurchaseOrder'],
    }),

    receivePurchaseOrder: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/purchases/orders/${id}/receive`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PurchaseOrder', id },
        'PurchaseOrder',
        'RawMaterial',
      ],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
} = purchaseApi;

