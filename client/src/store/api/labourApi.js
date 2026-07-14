import { apiSlice } from '../../app/apiSlice';

export const labourApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLabourers: builder.query({
      query: (params = {}) => ({ url: '/labour', params }),
      providesTags: ['Labour'],
    }),

    createLabour: builder.mutation({
      query: (body) => ({ url: '/labour', method: 'POST', body }),
      invalidatesTags: ['Labour'],
    }),

    updateLabour: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/labour/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Labour', id }, 'Labour'],
    }),

    deleteLabour: builder.mutation({
      query: (id) => ({ url: `/labour/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Labour'],
    }),

    logLabourAttendance: builder.mutation({
      query: (body) => ({ url: '/labour/attendance', method: 'POST', body }),
      invalidatesTags: ['LabourAttendance'],
    }),

    getLabourAttendance: builder.query({
      query: (params = {}) => ({ url: '/labour/attendance', params }),
      providesTags: ['LabourAttendance'],
    }),
  }),
});

export const {
  useGetLabourersQuery,
  useCreateLabourMutation,
  useUpdateLabourMutation,
  useDeleteLabourMutation,
  useLogLabourAttendanceMutation,
  useGetLabourAttendanceQuery,
} = labourApi;

