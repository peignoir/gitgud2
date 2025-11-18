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
    <form onSubmit={handleSubmit} className="pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2">
      <div className="rounded-[2rem] border border-surface-border bg-surface-panel px-5 py-4 shadow-lg shadow-slate-900/5">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ask about LP outreach, vehicle design..."
          disabled={disabled}
          rows={4}
          className="min-h-[80px] resize-none border-none bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus-visible:ring-0"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
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

