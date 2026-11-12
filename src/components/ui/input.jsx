import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "flex h-10 w-full rounded-md border bg-card px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, className)} {...props} />
));
Input.displayName = "Input";

export const Select = React.forwardRef(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, "appearance-none pr-8", className)} {...props} />
));
Select.displayName = "Select";

export const Label = ({ className, ...props }) => (
  <label className={cn("mb-1.5 block text-xs font-medium text-muted-foreground", className)} {...props} />
);
