import { apiSlice } from '../../app/apiSlice';

export const costingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSiteCosting: builder.query({
      query: (siteId) => `/costing/${siteId}`,
      providesTags: (result, error, siteId) => [{ type: 'SiteCosting', id: siteId }, 'SiteCosting'],
    }),
  }),
});

export const {
  useGetSiteCostingQuery,
} = costingApi;
