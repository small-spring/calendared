// Calendared: a language's name in English and in the language itself (e.g. "Japanese", "日本語"), for the emoji search
// languages. Intl knows every language there is a keyword file for
export function languageNames(language: string): { english: string; native: string } {
  const english = new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
  const native = new Intl.DisplayNames([language], { type: "language" }).of(language) ?? english;
  return { english, native };
}
