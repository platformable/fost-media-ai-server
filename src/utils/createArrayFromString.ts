function createArrayFromString(str: string | null | undefined): string[] {
  if (!str) return []
  return str
    .split(/"\n\n/)
    .map((bloque) => bloque.trim())
    .filter(Boolean)
}

export default createArrayFromString
