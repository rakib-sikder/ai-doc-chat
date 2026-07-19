export interface Chunk {
  id: string;
  text: string;
  index: number;
}

/**
 * Splits text into overlapping chunks on paragraph/sentence boundaries where possible,
 * falling back to a hard character split for very long unbroken text.
 */
export function chunkText(
  text: string,
  { chunkSize = 800, overlap = 150 }: { chunkSize?: number; overlap?: number } = {}
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length <= chunkSize) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }

    if (current) chunks.push(current);

    if (para.length <= chunkSize) {
      current = para;
    } else {
      // Paragraph itself is too long — hard split with overlap.
      let start = 0;
      while (start < para.length) {
        const end = Math.min(start + chunkSize, para.length);
        chunks.push(para.slice(start, end));
        if (end === para.length) break;
        start = end - overlap;
      }
      current = "";
    }
  }

  if (current) chunks.push(current);

  return chunks;
}
