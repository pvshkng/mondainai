import { SidebarThemeSettings } from "@/components/chat/sidebar-theme-settings";

export function ThemeSection() {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-foreground">Theme</h2>
      <div className="overflow-hidden rounded-lg border border-border/40">
        <SidebarThemeSettings onBack={() => {}} />
      </div>
    </div>
  );
}
