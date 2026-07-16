import { apiSlice } from '../../app/apiSlice';

export const wallTemplateApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWallTemplates: builder.query({
      query: (params = {}) => ({ url: '/wall-templates', params }),
      providesTags: ['WallTemplate'],
    }),

    getWallTemplate: builder.query({
      query: (id) => `/wall-templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'WallTemplate', id }],
    }),

    createWallTemplate: builder.mutation({
      query: (body) => ({ url: '/wall-templates', method: 'POST', body }),
      invalidatesTags: ['WallTemplate'],
    }),

    updateWallTemplate: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/wall-templates/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'WallTemplate', id }, 'WallTemplate'],
    }),

    deleteWallTemplate: builder.mutation({
      query: (id) => ({ url: `/wall-templates/${id}`, method: 'DELETE' }),
      invalidatesTags: ['WallTemplate'],
    }),

    setDefaultWallTemplate: builder.mutation({
      query: (id) => ({ url: `/wall-templates/${id}/set-default`, method: 'PATCH' }),
      invalidatesTags: ['WallTemplate'],
    }),

    calculateWallTemplate: builder.mutation({
      query: ({ id, wallLengthMeters }) => ({
        url: `/wall-templates/${id}/calculate`,
        method: 'POST',
        body: { wallLengthMeters },
      }),
    }),
  }),
});

export const {
  useGetWallTemplatesQuery,
  useGetWallTemplateQuery,
  useCreateWallTemplateMutation,
  useUpdateWallTemplateMutation,
  useDeleteWallTemplateMutation,
  useSetDefaultWallTemplateMutation,
  useCalculateWallTemplateMutation,
} = wallTemplateApi;
