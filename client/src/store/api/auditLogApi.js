import { apiSlice } from '../../app/apiSlice';

export const auditLogApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query({
      query: (params = {}) => ({ url: '/audit-logs', params }),
      providesTags: ['AuditLog'],
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
} = auditLogApi;
