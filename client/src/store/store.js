import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../app/apiSlice';
import authReducer from './slices/authSlice';
import branchReducer from './slices/branchSlice';
import uiReducer from './slices/uiSlice';
import {
  rawMaterialSlice,
  productSlice,
  bomSlice,
  productionSlice,
  inventorySlice,
  customerSlice,
  projectSiteSlice,
  quotationSlice,
  purchaseSlice,
  dispatchSlice,
  installationSlice,
  labourSlice,
  expenseSlice,
  costingSlice,
  reportSlice,
  notificationSlice,
} from './slices/moduleSlices';

export const store = configureStore({
  reducer: {
    // RTK Query cache
    [apiSlice.reducerPath]: apiSlice.reducer,

    // Core slices
    auth:         authReducer,
    branch:       branchReducer,
    ui:           uiReducer,

    // Feature stubs (expanded in later phases)
    rawMaterial:  rawMaterialSlice.reducer,
    product:      productSlice.reducer,
    bom:          bomSlice.reducer,
    production:   productionSlice.reducer,
    inventory:    inventorySlice.reducer,
    customer:     customerSlice.reducer,
    projectSite:  projectSiteSlice.reducer,
    quotation:    quotationSlice.reducer,
    purchase:     purchaseSlice.reducer,
    dispatch:     dispatchSlice.reducer,
    installation: installationSlice.reducer,
    labour:       labourSlice.reducer,
    expense:      expenseSlice.reducer,
    costing:      costingSlice.reducer,
    report:       reportSlice.reducer,
    notification: notificationSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),

  devTools: import.meta.env.DEV,
});
