import { diffLines, Change } from "diff";

export interface Hunk {
  originalStart: number;
  originalLines: number;
  modifiedStart: number;
  modifiedLines: number;
}

// Funde um par remove+add adjacente num único hunk de "substituição" —
// evita mostrar dois blocos separados (um vazio de remoção, outro de
// adição) quando na prática é uma troca de conteúdo na mesma região.
export function computeHunks(original: string, modified: string): Hunk[] {
  const changes: Change[] = diffLines(original, modified);
  const hunks: Hunk[] = [];

  let originalLine = 0;
  let modifiedLine = 0;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const lineCount = change.count ?? 0;

    if (change.added) {
      hunks.push({
        originalStart: originalLine,
        originalLines: 0,
        modifiedStart: modifiedLine,
        modifiedLines: lineCount,
      });
      modifiedLine += lineCount;
      continue;
    }

    if (change.removed) {
      const next = changes[i + 1];
      if (next?.added) {
        const nextCount = next.count ?? 0;
        hunks.push({
          originalStart: originalLine,
          originalLines: lineCount,
          modifiedStart: modifiedLine,
          modifiedLines: nextCount,
        });
        originalLine += lineCount;
        modifiedLine += nextCount;
        i++;
      } else {
        hunks.push({
          originalStart: originalLine,
          originalLines: lineCount,
          modifiedStart: modifiedLine,
          modifiedLines: 0,
        });
        originalLine += lineCount;
      }
      continue;
    }

    originalLine += lineCount;
    modifiedLine += lineCount;
  }

  return hunks;
}

// Preserva quebras de linha ao fatiar — necessário pra reconstruir o
// texto original exatamente ao rejeitar um hunk.
export function originalTextForHunk(original: string, hunk: Hunk): string {
  const lines = original.split(/(?<=\n)/);
  return lines.slice(hunk.originalStart, hunk.originalStart + hunk.originalLines).join("");
}
