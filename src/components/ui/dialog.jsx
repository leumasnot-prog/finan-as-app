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
        "fixed z-50 max-h-[92dvh] w-full overflow-y-auto border bg-card p-5 shadow-pop outline-none",
        "inset-x-0 bottom-0 rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
        className
      )}
      {...props}
    >
      {/* alça da folha inferior no celular: diz que dá para arrastar/fechar */}
      <span aria-hidden className="mx-auto -mt-2 mb-3 block h-1 w-10 rounded-full bg-border sm:hidden" />
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

// Rodapé que fica preso embaixo enquanto o conteúdo rola: o botão principal
// sempre ao alcance do polegar, mesmo em formulário comprido no celular.
export const DialogFooter = ({ className, ...props }) => (
  <div className={cn("sticky -bottom-5 z-10 -mx-5 mt-2 flex items-center gap-2 border-t bg-card px-5 pb-1 pt-3", className)} {...props} />
);
