export function sanitizeAIResponse(
  input: unknown
): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(
      /<think>[\s\S]*?<\/think>/gi,
      ''
    )
    .replace(
      /<analysis>[\s\S]*?<\/analysis>/gi,
      ''
    )
    .trim();
}
