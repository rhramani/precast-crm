import { apiSlice } from '../../app/apiSlice';

export const projectApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (params = {}) => ({ url: '/projects', params }),
      providesTags: ['Project'],
    }),

    getProject: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }, 'Project'],
    }),

    createProject: builder.mutation({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),

    updateProject: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),

    getProjectSites: builder.query({
      query: (id) => `/projects/${id}/sites`,
      providesTags: (result, error, id) => [{ type: 'Project', id: `${id}-sites` }, 'Site'],
    }),

    getSite: builder.query({
      query: (id) => `/sites/${id}`,
      providesTags: (result, error, id) => [{ type: 'Site', id }, 'Site'],
    }),

    createSite: builder.mutation({
      query: (body) => ({ url: '/sites', method: 'POST', body }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Project', id: `${projectId}-sites` },
        'Site',
      ],
    }),

    updateSite: builder.mutation({
      query: ({ id, projectId, ...body }) => ({ url: `/sites/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Project', id: `${projectId}-sites` },
        'Site',
      ],
    }),

    updateSiteStatus: builder.mutation({
      query: ({ id, projectId, status }) => ({
        url: `/sites/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Project', id: `${projectId}-sites` },
        'Site',
      ],
    }),

    calculateSiteRequirements: builder.mutation({
      query: ({ id, siteArea }) => ({
        url: `/sites/${id}/requirement-calculator`,
        method: 'POST',
        body: { siteArea },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Project', id: `${projectId}-sites` },
        'Site',
      ],
    }),

    deleteProject: builder.mutation({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),

    deleteSite: builder.mutation({
      query: (id) => ({ url: `/sites/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => [
        'Site',
        { type: 'Project', id: `${result?.data?.site?.projectId}-sites` }
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useGetProjectSitesQuery,
  useGetSiteQuery,
  useCreateSiteMutation,
  useUpdateSiteMutation,
  useUpdateSiteStatusMutation,
  useCalculateSiteRequirementsMutation,
  useDeleteProjectMutation,
  useDeleteSiteMutation,
} = projectApi;


