import { apiSlice } from '../../app/apiSlice';

export const rawMaterialCategoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRawMaterialCategories: builder.query({
      query: (params = {}) => ({ url: '/raw-material-categories', params }),
      providesTags: ['RawMaterialCategory'],
    }),

    createRawMaterialCategory: builder.mutation({
      query: (body) => ({ url: '/raw-material-categories', method: 'POST', body }),
      invalidatesTags: ['RawMaterialCategory'],
    }),

    updateRawMaterialCategory: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/raw-material-categories/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'RawMaterialCategory', id }, 'RawMaterialCategory'],
    }),

    deleteRawMaterialCategory: builder.mutation({
      query: (id) => ({ url: `/raw-material-categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['RawMaterialCategory'],
    }),
  }),
});

export const {
  useGetRawMaterialCategoriesQuery,
  useCreateRawMaterialCategoryMutation,
  useUpdateRawMaterialCategoryMutation,
  useDeleteRawMaterialCategoryMutation,
} = rawMaterialCategoryApi;
