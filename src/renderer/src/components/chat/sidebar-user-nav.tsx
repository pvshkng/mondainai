import { ChevronUp, Settings } from "lucide-react";
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
import { useSettingsModalStore } from "@/store/settings-modal-store";

const LOCAL_USER = { name: "You", email: "you@local.app" };

export function SidebarUserNav() {
  const openSection = useSettingsModalStore((s) => s.openSection);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
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
            className="w-56 rounded-lg border border-border/60 bg-card/95 backdrop-blur-xl"
            side="top"
            align="start"
          >
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onSelect={() => openSection("providers")}
            >
              <Settings className="size-3.5" />
              <span className="text-xs">Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
