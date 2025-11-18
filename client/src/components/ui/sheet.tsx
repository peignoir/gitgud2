import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetPortal = SheetPrimitive.Portal;
const SheetClose = SheetPrimitive.Close;

const SheetOverlay = ({ className, ...props }: SheetPrimitive.DialogOverlayProps) => (
  <SheetPrimitive.Overlay
    className={cn("fixed inset-0 bg-black/50 backdrop-blur-sm z-40", className)}
    {...props}
  />
);
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const SheetContent = ({
  className,
  children,
  side = "bottom",
  ...props
}: SheetPrimitive.DialogContentProps & { side?: "bottom" | "left" | "right" }) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      className={cn(
        "fixed z-50 flex flex-col bg-[#090b12] text-white shadow-xl",
        side === "bottom" && "inset-x-0 bottom-0 rounded-t-3xl",
        side === "left" && "inset-y-0 left-0 h-full w-80 rounded-r-3xl",
        side === "right" && "inset-y-0 right-0 h-full w-80 rounded-l-3xl",
        className
      )}
      {...props}
    >
      <SheetClose className="absolute right-4 top-4 text-white/60 hover:text-white">
        <X className="h-5 w-5" />
      </SheetClose>
      <div className="p-4 pt-12">{children}</div>
    </SheetPrimitive.Content>
  </SheetPortal>
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-1 text-center", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-base font-semibold", className)} {...props} />
);
SheetTitle.displayName = "SheetTitle";

const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-white/70", className)} {...props} />
);
SheetDescription.displayName = "SheetDescription";

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose };

