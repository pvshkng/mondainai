import { cn } from "@/lib/utils";

function emailToHue(email: string): number {
  let hash = 0;
  for (const char of email) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function UserAvatar({
  email,
  size = "sm",
}: {
  email: string;
  size?: "sm" | "md";
}) {
  const hue = emailToHue(email);
  const sizeClass = size === "sm" ? "size-4" : "size-7";
  return (
    <div
      className={cn(
        "shrink-0 rounded-full ring-1 ring-sidebar-border/50",
        sizeClass,
      )}
      style={{
        background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.25 0.05 ${hue + 40}))`,
      }}
    />
  );
}
