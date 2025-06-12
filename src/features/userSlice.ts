import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Activity {
  type: string;
  message: string;
  timestamp: string;
  // Add more fields as needed
}

interface UserState {
  uid: string | null;
  email: string;
  username: string;
  profilePicture: string | null;
  notifCount: number;
  preferences: string[];
  recentActivity: Activity[];
  numListings: number;
  isLoggedIn: boolean;
  wantedItems: string[];
  interests: string[];
  showDropdown: boolean;
  dropdownClosing: boolean;
  showEditProfile: boolean;
  error: string;
  success: string;
}

const initialState: UserState = {
  uid: null,
  email: '',
  username: '',
  profilePicture: null,
  notifCount: 0,
  preferences: [],
  recentActivity: [],
  numListings: 0,
  isLoggedIn: false,
  wantedItems: [],
  interests: [],
  showDropdown: false,
  dropdownClosing: false,
  showEditProfile: false,
  error: '',
  success: '',
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<Partial<UserState>>) {
      Object.assign(state, action.payload);
    },
    setLoggedIn(state, action: PayloadAction<boolean>) {
      state.isLoggedIn = action.payload;
    },
    setNotifCount(state, action: PayloadAction<number>) {
      state.notifCount = action.payload;
    },
    setRecentActivity(state, action: PayloadAction<Activity[]>) {
      state.recentActivity = action.payload;
    },
    setNumListings(state, action: PayloadAction<number>) {
      state.numListings = action.payload;
    },
    setWantedItems(state, action: PayloadAction<string[]>) {
      state.wantedItems = action.payload;
    },
    setInterests(state, action: PayloadAction<string[]>) {
      state.interests = action.payload;
    },
    setShowDropdown(state, action: PayloadAction<boolean>) {
      state.showDropdown = action.payload;
    },
    setDropdownClosing(state, action: PayloadAction<boolean>) {
      state.dropdownClosing = action.payload;
    },
    setShowEditProfile(state, action: PayloadAction<boolean>) {
      state.showEditProfile = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    setSuccess(state, action: PayloadAction<string>) {
      state.success = action.payload;
    },
    logoutUser(state) {
      Object.assign(state, initialState);
    },
    // Add more reducers as needed
  },
});

export const {
  setUser,
  setLoggedIn,
  setNotifCount,
  setRecentActivity,
  setNumListings,
  setWantedItems,
  setInterests,
  setShowDropdown,
  setDropdownClosing,
  setShowEditProfile,
  setError,
  setSuccess,
  logoutUser,
} = userSlice.actions;

export default userSlice.reducer;
