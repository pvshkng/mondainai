
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker";
import type { ComponentProps, Ref } from "react";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: ComponentProps<typeof DayPicker> & {
  buttonVariant?: ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("border-0", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 sm:flex-row [&_[role=gridcell]]:w-[--cell-size] [&_[role=gridcell]]:h-[--cell-size] [&_[role=gridcell]]:text-sm [&_[role=gridcell]]:p-0 [--cell-size:--spacing(9)]",
          defaultClassNames.months,
        ),
        month: cn("flex flex-col gap-4", defaultClassNames.month),
        month_caption: cn(
          "relative mx-10 flex h-7 items-center justify-center",
          defaultClassNames.month_caption,
        ),
        caption_label: cn(
          "truncate text-sm font-medium",
          defaultClassNames.caption_label,
        ),
        nav: cn(
          "absolute inset-x-0 flex items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "absolute left-0 size-7 bg-transparent p-0 opacity-50 hover:opacity-100 [&_svg]:size-4",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "absolute right-0 size-7 bg-transparent p-0 opacity-50 hover:opacity-100 [&_svg]:size-4",
          defaultClassNames.button_next,
        ),
        weekday: cn(
          "size-[--cell-size] text-[0.8rem] font-normal text-muted-foreground",
          defaultClassNames.weekday,
        ),
        day: cn(
          "group/day relative rounded-md p-0 text-center text-sm [&:first-child[data-selected=true]_button]:rounded-s-(--cell-radius) [&:last-child[data-selected=true]_button]:rounded-e-(--cell-radius) [&:nth-child(2)[data-selected=true]_button]:rounded-s-(--cell-radius) [--cell-radius:calc(var(--radius)-1px)]",
          defaultClassNames.day,
        ),
        day_button: cn(""),
        range_start: cn(
          "bg-accent rounded-s-(--cell-radius) [&_button]:bg-secondary [&_button]:text-secondary-foreground [&_button]:hover:bg-secondary [&_button]:hover:text-secondary-foreground after:absolute after:inset-y-0 after:end-0 after:w-1/2 after:bg-accent",
          defaultClassNames.range_start,
        ),
        range_end: cn(
          "bg-accent rounded-e-(--cell-radius) [&_button]:bg-secondary [&_button]:text-secondary-foreground [&_button]:hover:bg-secondary [&_button]:hover:text-secondary-foreground after:absolute after:inset-y-0 after:start-0 after:w-1/2 after:bg-accent",
          defaultClassNames.range_end,
        ),
        range_middle: cn(
          "!bg-accent [&_button]:bg-transparent [&_button]:!text-foreground [&_button]:hover:bg-transparent [&_button]:hover:!text-foreground",
          defaultClassNames.range_middle,
        ),
        selected: cn(
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground",
          defaultClassNames.selected,
        ),
        today: cn(
          "[&_button]:bg-accent [&_button]:text-accent-foreground",
          defaultClassNames.today,
        ),
        outside: cn(
          "[&_button]:text-muted-foreground [&_button]:opacity-50 [&_button]:aria-selected:bg-accent/50 [&_button]:aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "[&_button]:text-muted-foreground [&_button]:opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        dropdowns: cn(
          "relative inline-flex items-center gap-4 [&>span]:hidden",
          defaultClassNames.dropdowns,
        ),
        dropdown: cn("absolute inset-0 opacity-0", defaultClassNames.dropdown),
        dropdown_root: cn(
          "relative inline-flex items-center",
          defaultClassNames.dropdown_root,
        ),
        ...classNames,
      }}
      components={{
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

const CalendarDayButton = ({
  className,
  day,
  modifiers,
  ref,
  ...props
}: ComponentProps<typeof DayButton> & { ref?: Ref<HTMLButtonElement> }) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected || undefined}
      data-disabled={modifiers.disabled || undefined}
      data-hidden={modifiers.hidden || undefined}
      data-outside={modifiers.outside || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-today={modifiers.today || undefined}
      className={cn(
        "relative z-20 size-[--cell-size] rounded-md p-0 text-sm font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100 data-[range-end=true]:rounded-e-(--cell-radius) data-[range-start=true]:rounded-s-(--cell-radius)",
        className,
      )}
      {...props}
    />
  );
};

Calendar.displayName = "Calendar";

export { Calendar, CalendarDayButton };
