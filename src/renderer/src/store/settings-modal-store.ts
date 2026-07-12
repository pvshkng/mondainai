import { create } from "zustand";

export type SettingsSection = "providers" | "mcp" | "skills" | "theme";

interface SettingsModalState {
  open: boolean;
  section: SettingsSection;
  setOpen: (open: boolean) => void;
  openSection: (section: SettingsSection) => void;
}

export const useSettingsModalStore = create<SettingsModalState>((set) => ({
  open: false,
  section: "providers",
  setOpen: (open) => set({ open }),
  openSection: (section) => set({ open: true, section }),
}));
