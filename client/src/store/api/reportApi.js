import { apiSlice } from '../../app/apiSlice';

export const reportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductionReport: builder.query({
      query: (params) => ({ url: '/reports/production', params }),
      providesTags: ['Reports'],
    }),

    getInventoryReport: builder.query({
      query: (params) => ({ url: '/reports/inventory', params }),
      providesTags: ['Reports'],
    }),

    getCustomerReport: builder.query({
      query: (params) => ({ url: '/reports/customer', params }),
      providesTags: ['Reports'],
    }),

    getProjectReport: builder.query({
      query: (params) => ({ url: '/reports/project', params }),
      providesTags: ['Reports'],
    }),

    getFinancialReport: builder.query({
      query: (params) => ({ url: '/reports/financial', params }),
      providesTags: ['Reports'],
    }),

    getBranchPerformance: builder.query({
      query: (params) => ({ url: '/reports/branch-performance', params }),
      providesTags: ['Reports'],
    }),

    getDashboardStats: builder.query({
      query: (params) => ({ url: '/reports/dashboard-stats', params }),
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
  useGetDashboardStatsQuery,
} = reportApi;
