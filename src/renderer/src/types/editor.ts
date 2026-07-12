import { ThemeStyles } from "./theme";

export interface BaseEditorState {
  styles: ThemeStyles;
}

export interface ThemeEditorState extends BaseEditorState {
  preset?: string;
  styles: ThemeStyles;
  currentMode: "light" | "dark";
  hslAdjustments?: {
    hueShift: number;
    saturationScale: number;
    lightnessScale: number;
  };
}
