import { apiSlice } from '../../app/apiSlice';

export const equipmentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEquipmentList: builder.query({
      query: (params = {}) => ({ url: '/equipment', params }),
      providesTags: ['Equipment'],
    }),

    createEquipment: builder.mutation({
      query: (body) => ({ url: '/equipment', method: 'POST', body }),
      invalidatesTags: ['Equipment'],
    }),

    updateEquipment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/equipment/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Equipment', id }, 'Equipment'],
    }),

    allocateEquipment: builder.mutation({
      query: ({ id, siteId }) => ({
        url: `/equipment/${id}/allocate`,
        method: 'PATCH',
        body: { siteId },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Equipment', id }, 'Equipment', 'Site'],
    }),

    releaseEquipment: builder.mutation({
      query: (id) => ({
        url: `/equipment/${id}/release`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Equipment', id }, 'Equipment', 'Site'],
    }),

    deleteEquipment: builder.mutation({
      query: (id) => ({
        url: `/equipment/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Equipment'],
    }),
  }),
});

export const {
  useGetEquipmentListQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useAllocateEquipmentMutation,
  useReleaseEquipmentMutation,
  useDeleteEquipmentMutation,
} = equipmentApi;
