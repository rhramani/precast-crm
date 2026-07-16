import { apiSlice } from '../../app/apiSlice';

export const costingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSiteCosting: builder.query({
      query: (siteId) => `/costing/${siteId}`,
      providesTags: (result, error, siteId) => [{ type: 'SiteCosting', id: siteId }, 'SiteCosting'],
    }),
    getProjectCosting: builder.query({
      query: (projectId) => `/costing/project/${projectId}`,
      providesTags: (result, error, projectId) => [{ type: 'ProjectCosting', id: projectId }, 'ProjectCosting'],
    }),
  }),
});

export const {
  useGetSiteCostingQuery,
  useGetProjectCostingQuery,
} = costingApi;
