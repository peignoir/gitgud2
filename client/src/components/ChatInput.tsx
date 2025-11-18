import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
};

export const ChatInput = ({ value, onChange, onSubmit, disabled }: ChatInputProps) => {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="rounded-3xl border border-white/12 bg-surface-card px-4 py-4 shadow-glow backdrop-blur-md supports-[backdrop-filter]:bg-surface-card/80">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ask about LP outreach, vehicle design..."
          disabled={disabled}
          rows={3}
          className="min-h-[72px] resize-none bg-white text-base text-slate-900 placeholder:text-slate-500"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
          <span>Shift + Enter for a newline</span>
          <Button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send"
            className="ml-auto flex items-center gap-2"
          >
            Send
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
};

