import { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[#05060a] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask about LP outreach, vehicle design..."
        disabled={disabled}
      />
      <Button type="submit" disabled={disabled || !value.trim()} aria-label="Send">
        Send
      </Button>
    </form>
  );
};

