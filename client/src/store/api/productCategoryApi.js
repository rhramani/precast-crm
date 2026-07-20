import { apiSlice } from '../../app/apiSlice';

export const productCategoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductCategories: builder.query({
      query: (params = {}) => ({ url: '/product-categories', params }),
      providesTags: ['ProductCategory'],
    }),

    createProductCategory: builder.mutation({
      query: (body) => ({ url: '/product-categories', method: 'POST', body }),
      invalidatesTags: ['ProductCategory'],
    }),

    updateProductCategory: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/product-categories/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ProductCategory', id }, 'ProductCategory'],
    }),

    deleteProductCategory: builder.mutation({
      query: (id) => ({ url: `/product-categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProductCategory'],
    }),
  }),
});

export const {
  useGetProductCategoriesQuery,
  useCreateProductCategoryMutation,
  useUpdateProductCategoryMutation,
  useDeleteProductCategoryMutation,
} = productCategoryApi;
