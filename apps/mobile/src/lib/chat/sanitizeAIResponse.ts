export interface ParsedAIResponse {
  clean: string;
  reasoning: string | null;
}

export function parseAIResponse(input: unknown): ParsedAIResponse {
  if (typeof input !== 'string') {
    return { clean: '', reasoning: null };
  }

  const thinkMatches: string[] = [];

  // Extract <think>...</think>
  let text = input.replace(/<think>([\s\S]*?)<\/think>/gi, (_, match) => {
    if (match && match.trim()) {
      thinkMatches.push(match.trim());
    }
    return '';
  });

  // Extract <analysis>...</analysis>
  text = text.replace(/<analysis>([\s\S]*?)<\/analysis>/gi, (_, match) => {
    if (match && match.trim()) {
      thinkMatches.push(match.trim());
    }
    return '';
  });

  // Extract ```thinking ... ``` or ```reasoning ... ```
  text = text.replace(/```(?:thinking|reasoning)\s*([\s\S]*?)```/gi, (_, match) => {
    if (match && match.trim()) {
      thinkMatches.push(match.trim());
    }
    return '';
  });

  const reasoning = thinkMatches.length > 0 ? thinkMatches.join('\n\n') : null;
  const clean = text.trim();

  return {
    clean,
    reasoning,
  };
}

export function sanitizeAIResponse(input: unknown): string {
  return parseAIResponse(input).clean;
}
