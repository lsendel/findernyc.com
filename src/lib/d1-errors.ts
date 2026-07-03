function d1ErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isMissingD1TableError(error: unknown): boolean {
  return d1ErrorMessage(error).includes('no such table');
}

export function isUnavailableD1Error(error: unknown): boolean {
  const message = d1ErrorMessage(error);
  return (
    isMissingD1TableError(error) ||
    message.includes('has been deleted') ||
    message.includes('could not be found')
  );
}
