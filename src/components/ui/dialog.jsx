import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn("font-display text-xl font-bold", className)} {...props} />
);
export const DialogDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 max-h-[92dvh] w-full overflow-y-auto border bg-card p-5 shadow-xl outline-none",
        "inset-x-0 bottom-0 rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";
