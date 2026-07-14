import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth > 768 : true,      // Sidebar expanded/collapsed
  activeModal: null,      // Which modal is currently open (string key or null)
  modalData: null,        // Data payload for the active modal
  drawerOpen: false,
  drawerType: null,       // 'add' | 'edit'
  drawerData: null,
  themeMode: 'light',     // Future: dark mode support
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    openModal: (state, action) => {
      state.activeModal = action.payload.modal;
      state.modalData = action.payload.data || null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    openDrawer: (state, action) => {
      state.drawerOpen = true;
      state.drawerType = action.payload.type || 'add';
      state.drawerData = action.payload.data || null;
    },
    closeDrawer: (state) => {
      state.drawerOpen = false;
      state.drawerType = null;
      state.drawerData = null;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  openDrawer,
  closeDrawer,
} = uiSlice.actions;
export default uiSlice.reducer;

export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectActiveModal = (state) => state.ui.activeModal;
export const selectModalData = (state) => state.ui.modalData;
export const selectDrawerOpen = (state) => state.ui.drawerOpen;
export const selectDrawerType = (state) => state.ui.drawerType;
export const selectDrawerData = (state) => state.ui.drawerData;
