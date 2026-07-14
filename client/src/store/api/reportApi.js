import { apiSlice } from '../../app/apiSlice';

export const reportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductionReport: builder.query({
      query: () => '/reports/production',
      providesTags: ['Reports'],
    }),

    getInventoryReport: builder.query({
      query: () => '/reports/inventory',
      providesTags: ['Reports'],
    }),

    getCustomerReport: builder.query({
      query: () => '/reports/customer',
      providesTags: ['Reports'],
    }),

    getProjectReport: builder.query({
      query: () => '/reports/project',
      providesTags: ['Reports'],
    }),

    getFinancialReport: builder.query({
      query: () => '/reports/financial',
      providesTags: ['Reports'],
    }),

    getBranchPerformance: builder.query({
      query: () => '/reports/branch-performance',
      providesTags: ['Reports'],
    }),
  }),
});

export const {
  useGetProductionReportQuery,
  useGetInventoryReportQuery,
  useGetCustomerReportQuery,
  useGetProjectReportQuery,
  useGetFinancialReportQuery,
  useGetBranchPerformanceQuery,
} = reportApi;
