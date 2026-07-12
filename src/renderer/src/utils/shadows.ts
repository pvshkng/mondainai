import { colorFormatter } from "./color-converter";
import { applyStyleToElement } from "./apply-style-to-element";
import { ThemeEditorState } from "@/types/editor";
import { defaultThemeState } from "@/config/theme";

export const getShadowMap = (themeEditorState: ThemeEditorState) => {
  const mode = themeEditorState.currentMode;
  const styles = {
    ...defaultThemeState.styles[mode],
    ...themeEditorState.styles[mode],
  };

  const shadowColor = styles["shadow-color"];
  const hsl = colorFormatter(shadowColor, "hsl", "3");
  const offsetX = styles["shadow-offset-x"];
  const offsetY = styles["shadow-offset-y"];
  const blur = styles["shadow-blur"];
  const spread = styles["shadow-spread"];
  const opacity = parseFloat(styles["shadow-opacity"]);
  const color = (opacityMultiplier: number) =>
    `hsl(${hsl} / ${(opacity * opacityMultiplier).toFixed(2)})`;

  const secondLayer = (fixedOffsetY: string, fixedBlur: string): string => {
    const spread2 = (parseFloat(spread?.replace("px", "") ?? "0") - 1).toString() + "px";
    const color2 = color(1.0);
    return `${offsetX} ${fixedOffsetY} ${fixedBlur} ${spread2} ${color2}`;
  };

  const shadowMap: { [key: string]: string } = {
    "shadow-2xs": `${offsetX} ${offsetY} ${blur} ${spread} ${color(0.5)}`,
    "shadow-xs": `${offsetX} ${offsetY} ${blur} ${spread} ${color(0.5)}`,
    "shadow-2xl": `${offsetX} ${offsetY} ${blur} ${spread} ${color(2.5)}`,
    "shadow-sm": `${offsetX} ${offsetY} ${blur} ${spread} ${color(1.0)}, ${secondLayer("1px", "2px")}`,
    shadow: `${offsetX} ${offsetY} ${blur} ${spread} ${color(1.0)}, ${secondLayer("1px", "2px")}`,
    "shadow-md": `${offsetX} ${offsetY} ${blur} ${spread} ${color(1.0)}, ${secondLayer("2px", "4px")}`,
    "shadow-lg": `${offsetX} ${offsetY} ${blur} ${spread} ${color(1.0)}, ${secondLayer("4px", "6px")}`,
    "shadow-xl": `${offsetX} ${offsetY} ${blur} ${spread} ${color(1.0)}, ${secondLayer("8px", "10px")}`,
  };

  return shadowMap;
};

export function setShadowVariables(themeEditorState: ThemeEditorState) {
  const root = document.documentElement;
  const shadows = getShadowMap(themeEditorState);
  Object.entries(shadows).forEach(([name, value]) => {
    applyStyleToElement(root, name, value);
  });
}
