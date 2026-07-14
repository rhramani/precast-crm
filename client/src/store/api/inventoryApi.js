import { apiSlice } from '../../app/apiSlice';

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRawMaterialsInventory: builder.query({
      query: () => '/inventory/raw-materials',
      providesTags: ['RawMaterial', 'Inventory'],
    }),

    getWipInventory: builder.query({
      query: () => '/inventory/wip',
      providesTags: ['Production', 'Inventory'],
    }),

    getFinishedGoodsInventory: builder.query({
      query: () => '/inventory/finished-goods',
      providesTags: ['Product', 'Inventory'],
    }),
  }),
});

export const {
  useGetRawMaterialsInventoryQuery,
  useGetWipInventoryQuery,
  useGetFinishedGoodsInventoryQuery,
} = inventoryApi;
