/**
 * A value a settings page shows, remembered as it was when the page was drawn, to tell when the page needs drawing
 * again (e.g. the warning on Migrate notes, which follows the notices rather than a setting of its own)
 */
export class DrawnValue<T> {
  private drawn: { value: T } | null = null;

  constructor(private readonly read: () => T) {}

  /** The current value, remembered as drawn */
  draw(): T {
    const value = this.read();
    this.drawn = { value };
    return value;
  }

  /** Whether the value differs from the one drawn; false before the first drawing */
  changed(): boolean {
    return this.drawn !== null && this.read() !== this.drawn.value;
  }
}
