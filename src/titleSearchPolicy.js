const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim()

export const normalizeTitleSearchText = (text) => {
  if (text === null || text === undefined) return ''
  const normalized = String(text).normalize('NFKC').toLowerCase()
  return normalizeWhitespace(normalized)
}

export const matchesTitle = ({ title, query }) => {
  const normalizedTitle = normalizeTitleSearchText(title)
  const normalizedQuery = normalizeTitleSearchText(query)
  if (!normalizedQuery) return false
  return normalizedTitle.includes(normalizedQuery)
}
