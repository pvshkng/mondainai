import { useState } from "react";
import { ChevronUp, Palette, Settings, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserAvatar } from "./user-avatar";
import { SidebarThemeSettings } from "./sidebar-theme-settings";
import { useSettingsModalStore } from "@/store/settings-modal-store";

const LOCAL_USER = { name: "You", email: "you@local.app" };

type DropdownView = "main" | "theme";

export function SidebarUserNav() {
  const [dropdownView, setDropdownView] = useState<DropdownView>("main");
  const openSection = useSettingsModalStore((s) => s.openSection);

  const contentWidth = dropdownView === "theme" ? "w-72" : "w-56";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) setTimeout(() => setDropdownView("main"), 150);
          }}
        >
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-8 px-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground"
              tooltip={LOCAL_USER.name}
            >
              <UserAvatar email={LOCAL_USER.email} size="sm" />
              <span className="truncate text-[13px]">{LOCAL_USER.name}</span>
              <ChevronUp className="ml-auto size-3.5 text-sidebar-foreground/50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className={`rounded-lg border border-border/60 bg-card/95 backdrop-blur-xl ${contentWidth}`}
            side="top"
            align="start"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {dropdownView === "main" && (
              <>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onSelect={() => openSection("providers")}
                >
                  <Settings className="size-3.5" />
                  <span className="flex-1 text-xs">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDropdownView("theme");
                  }}
                >
                  <Palette className="size-3.5" />
                  <span className="flex-1 text-xs">Theme</span>
                  <ChevronRight className="size-3 text-muted-foreground" />
                </DropdownMenuItem>
              </>
            )}

            {dropdownView === "theme" && (
              <SidebarThemeSettings onBack={() => setDropdownView("main")} />
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
