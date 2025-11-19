import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Upload } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const PdfUploadSheet = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) {
      return;
    }
    setIsLoading(true);
    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/files/pdf`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }
      setStatus(data.summary || "PDF indexed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to upload PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Upload PDF">
          <Upload className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Attach a PDF</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 text-sm text-white/70 mt-4">
          <p>Drop a memo, deck, or vehicle doc. It becomes part of the shared doc base instantly.</p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 py-6 text-white cursor-pointer hover:border-brand">
            <span className="text-white font-semibold">{isLoading ? "Uploading..." : "Tap to select a file"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={isLoading}
              onChange={(event) => handleFile(event.target.files?.[0] || undefined)}
            />
          </label>
          {status && <p className="text-xs text-white/80">{status}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
};

