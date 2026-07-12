import { cn } from "@/lib/utils";
import { ChevronRight, PenSquareIcon } from "lucide-react";
import { useRouter } from "@/lib/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  SidebarHistory,
  getChatHistoryPaginationKey,
} from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type User = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
} | null;

export function AppSidebar({ user }: { user: User }) {
  const { mutate } = useSWRConfig();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { setOpenMobile, toggleSidebar, state } = useSidebar();
  const router = useRouter();

  const handleDeleteAll = async () => {
    setShowDeleteDialog(false);
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });
    toast.success("All chats deleted");
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center justify-center">
              <div
                className={cn(
                  "group/logo relative flex flex-row items-center",
                  state === "expanded"
                    ? "w-full justify-end"
                    : "justify-center",
                )}
              >
                <SidebarMenuButton
                  asChild
                  onClick={() => {
                    toggleSidebar();
                    setOpenMobile(false);
                  }}
                  className="size-7 flex flex-row items-center justify-end"
                  tooltip="Toggle sidebar"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 text-sidebar-foreground/50",
                      state === "expanded" && "rotate-180",
                    )}
                  />
                </SidebarMenuButton>
              </div>
              <div hidden className="group-data-[collapsible=icon]:hidden">
                <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="flex flex-row w-full items-center justify-center">
                  <SidebarMenuButton
                    className="m-0! w-full h-8 rounded-lg border border-sidebar-border text-sm text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    tooltip="New Chat"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/chat");
                    }}
                  >
                    <PenSquareIcon className="size-3!" />
                    <span className="font-medium text-xs">New chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarHistory user={user} />
        </SidebarContent>

        <SidebarFooter>
          { }
          <SidebarUserNav />
        </SidebarFooter>

        { }
      </Sidebar>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All of your chat history will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
