export function capitalize(string: string) {
  return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

/** Calendared: "1 note", "3 notes" (the settings' counts and the migrations) */
export function countOf(n: number, thing: string): string {
  return `${n} ${n === 1 ? thing : `${thing}s`}`;
}
