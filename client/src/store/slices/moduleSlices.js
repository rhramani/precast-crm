import { createSlice } from '@reduxjs/toolkit';

// ──────────────────────────────────────────────────────────────
// Stub slices — Phase 0
// Each slice will be expanded with proper state in its respective phase.
// Keeping them here as stubs ensures the Redux store compiles and
// the RTK Query tag types resolve correctly from day one.
// ──────────────────────────────────────────────────────────────

const makeStubSlice = (name) =>
  createSlice({ name, initialState: {}, reducers: {} });

export const rawMaterialSlice  = makeStubSlice('rawMaterial');
export const productSlice      = makeStubSlice('product');
export const bomSlice          = makeStubSlice('bom');
export const productionSlice   = makeStubSlice('production');
export const inventorySlice    = makeStubSlice('inventory');
export const customerSlice     = makeStubSlice('customer');
export const projectSiteSlice  = makeStubSlice('projectSite');
export const quotationSlice    = makeStubSlice('quotation');
export const purchaseSlice     = makeStubSlice('purchase');
export const dispatchSlice     = makeStubSlice('dispatch');
export const installationSlice = makeStubSlice('installation');
export const labourSlice       = makeStubSlice('labour');
export const expenseSlice      = makeStubSlice('expense');
export const costingSlice      = makeStubSlice('costing');
export const reportSlice       = makeStubSlice('report');
export const notificationSlice = makeStubSlice('notification');
