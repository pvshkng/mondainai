
import type { ReactNode } from "react";
import { create } from "zustand";

interface InspectPanelState {
  isOpen: boolean;
  content: ReactNode | null;
  panelId: string | null;
  openPanel: (panelId: string, content: ReactNode) => void;
  closePanel: () => void;
}

export const useInspectPanel = create<InspectPanelState>((set, get) => ({
  isOpen: false,
  content: null,
  panelId: null,
  openPanel: (panelId, content) => {
    const state = get();
    if (state.isOpen && state.panelId === panelId) {
      set({ isOpen: false, content: null, panelId: null });
    } else {
      set({ isOpen: true, content, panelId });
    }
  },
  closePanel: () => set({ isOpen: false, content: null, panelId: null }),
}));
