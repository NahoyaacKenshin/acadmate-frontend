import { create } from 'zustand';

interface SystemState {
  isOnline: boolean;
  isSyncing: boolean;
  setOnlineStatus: (status: boolean) => void;
  setSyncStatus: (status: boolean) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  isOnline: true,
  isSyncing: false,
  
  setOnlineStatus: (status) => set({ isOnline: status }),
  setSyncStatus: (status) => set({ isSyncing: status }),
}));
