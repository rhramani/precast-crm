import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentBranch: null,   // { _id, branchName, branchCode } — active branch context
  branchList: [],         // all branches (super_admin only)
};

const branchSlice = createSlice({
  name: 'branch',
  initialState,
  reducers: {
    setCurrentBranch: (state, action) => {
      state.currentBranch = action.payload;
    },
    setBranchList: (state, action) => {
      state.branchList = action.payload;
    },
  },
});

export const { setCurrentBranch, setBranchList } = branchSlice.actions;
export default branchSlice.reducer;

export const selectCurrentBranch = (state) => state.branch.currentBranch;
export const selectBranchList = (state) => state.branch.branchList;
