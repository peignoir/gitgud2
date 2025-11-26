export function extractJsonBlock(text: string, marker: string): string {
  const regex = new RegExp(`\`\`\`json\\s+${marker}\\s*([\\s\\S]*?)\`\`\``, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

