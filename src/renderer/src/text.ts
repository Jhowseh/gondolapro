export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
