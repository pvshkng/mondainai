
import type { ReactNode } from "react";
import { create } from "zustand";

interface InspectPanelState {
  isOpen: boolean;
  content: ReactNode | null;
  panelId: string | null;
  title: string | null;
  openPanel: (panelId: string, content: ReactNode, title?: string) => void;
  closePanel: () => void;
}

export const useInspectPanel = create<InspectPanelState>((set, get) => ({
  isOpen: false,
  content: null,
  panelId: null,
  title: null,
  openPanel: (panelId, content, title) => {
    const state = get();
    if (state.isOpen && state.panelId === panelId) {
      set({ isOpen: false, content: null, panelId: null, title: null });
    } else {
      set({ isOpen: true, content, panelId, title: title ?? null });
    }
  },
  closePanel: () => set({ isOpen: false, content: null, panelId: null, title: null }),
}));
