export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 10000
): Promise<T> {
  let timer:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeout = new Promise<never>(
    (_, reject) => {
      timer = setTimeout(
        () => reject(
          new Error('TIMEOUT')
        ),
        timeoutMs
      );
    }
  );

  try {
    return await Promise.race([
      promise,
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function userFacingError(
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : '';

  if (message === 'TIMEOUT') {
    return 'The request took too long. Try again.';
  }

  return 'Something went wrong. Try again.';
}
