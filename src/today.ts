// Calendared: deciding what "today" is, moved out of the calendar view's timer so the plugin keeps it current
// even while the calendar pane is closed (Open now, breadcrumbs and the mini calendar read it too)

/**
 * What to set when the clock reads `now`: the new today (null while the date is the same, so the stores don't
 * re-render every minute) and the month to show (null to leave it). The calendar follows a new month only when it
 * showed today's month (docs/adr/0018, (3))
 */
export function nextToday(
  today: moment.Moment,
  displayed: moment.Moment,
  now: moment.Moment,
): { today: moment.Moment | null; displayed: moment.Moment | null } {
  if (now.isSame(today, "day")) return { today: null, displayed: null };
  const follows = displayed.isSame(today, "month") && !now.isSame(today, "month");
  return { today: now.clone(), displayed: follows ? now.clone() : null };
}
