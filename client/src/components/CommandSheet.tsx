import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Sparkles } from "lucide-react";

const commands = [
  { label: "/help", description: "Show available slash commands" },
  { label: "/quiet", description: "Toggle verbose reasoning" }
];

type CommandSheetProps = {
  onCommand: (command: string) => void;
};

export const CommandSheet = ({ onCommand }: CommandSheetProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Commands">
          <Sparkles className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Slash commands</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {commands.map((cmd) => (
            <button
              key={cmd.label}
              className="w-full rounded-2xl border border-white/15 px-4 py-3 text-left text-sm text-white/80 hover:border-brand"
              onClick={() => {
                onCommand(cmd.label);
                setOpen(false);
              }}
            >
              <span className="font-semibold text-white">{cmd.label}</span>
              <p className="text-xs text-white/60">{cmd.description}</p>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

