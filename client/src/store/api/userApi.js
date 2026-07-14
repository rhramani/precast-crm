import { apiSlice } from '../../app/apiSlice';

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /users
    getUsers: builder.query({
      query: (params = {}) => ({ url: '/users', params }),
      providesTags: ['User'],
    }),

    // POST /users
    createUser: builder.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),

    // PUT /users/:id
    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: (_, __, { id }) => [{ type: 'User', id }, 'User'],
    }),

    // PATCH /users/:id/status
    updateUserStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/users/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
} = userApi;
