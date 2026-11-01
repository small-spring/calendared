import { YEARS_RANGE_SIZE, YEARS_RANGES_START } from '@/constants';
import { periodOf, rangeOfPeriod, type PeriodRules } from '@/periods';
import { get, writable } from 'svelte/store';

type IRange = `${string}-${string}`
function createYearsRangesStore() {
  const defaultRange =
    `${YEARS_RANGES_START}-${YEARS_RANGES_START + YEARS_RANGE_SIZE - 1}` as IRange;
  const store = writable<{
    ranges: IRange[];
    todayRange: `${string}-${string}`;
    crrRangeIndex: number;
  }>({
    ranges: [defaultRange],
    todayRange: defaultRange,
    crrRangeIndex: 0
  });

  const addNewRange = ({
    startYear,
    action
  }: {
    startYear: number;
    action: 'increment' | 'decrement';
  }) => {
    store.update((values) => {
      const newRanges = values.ranges;
      newRanges[action === 'increment' ? 'push' : 'unshift'](
        `${startYear}-${startYear + YEARS_RANGE_SIZE - 1}`
      );

      return {
        ...values,
        ranges: newRanges
      };
    });
  };
  // Calendared: the ranges count years by name, like the year view's cells: a year that doesn't start in January is
  // named by its start or end year (docs/adr/0039). Upstream counted calendar years
  const startOfYearNamed = (year: number, rules: PeriodRules) => rangeOfPeriod({ granularity: 'year', year }, rules)!.start;
  const updateRanges = ({
    action,
    displayedDateModifier,
    rules
  }: {
    action: 'decrement' | 'increment';
    displayedDateModifier?: number;
    rules: PeriodRules;
  }) => {
    const { ranges, crrRangeIndex } = get(store);
    const crrRange = ranges[crrRangeIndex];
    const [crrRangeStartYear, crrRangeEndYear] = crrRange.split('-');

    if (action === 'decrement') {
      const prevRange = ranges[crrRangeIndex - 1];

      displayedDateStore.set(startOfYearNamed(+crrRangeStartYear + (displayedDateModifier || -1), rules));

      if (!prevRange) {
        addNewRange({
          startYear: +crrRangeStartYear - YEARS_RANGE_SIZE,
          action: 'decrement'
        });
      }

      if (crrRangeIndex > 0) {
        updateCrrRangeIndex({ modifier: -1 });
      }
    }

    if (action === 'increment') {
      const nextRange = ranges[crrRangeIndex + 1];

      displayedDateStore.set(startOfYearNamed(+crrRangeEndYear + 1, rules));

      if (!nextRange) {
        addNewRange({ startYear: +crrRangeEndYear + 1, action: 'increment' });
      }
      updateCrrRangeIndex({ modifier: +1 });
    }
  };
  const updateCrrRangeIndex = ({ modifier }: { modifier: number }) => {
    store.update((values) => ({
      ...values,
      crrRangeIndex: values.crrRangeIndex + modifier
    }));
  };
  const selectOrCreateRanges = (rules: PeriodRules) => {
    const { ranges, crrRangeIndex, todayRange } = get(store);
    const crrDisplayedYear = (periodOf('year', get(displayedDateStore), rules) as { year: number }).year;
    const todayYear = (periodOf('year', window.moment(), rules) as { year: number }).year;

    const firstRange = ranges[0];
    const lastRange = ranges[ranges.length - 1];
    const firstRangeStartYear = firstRange.split('-')[0];
    const lastRangeEndYear = lastRange.split('-')[1];

    const newRanges = [...ranges];
    let newCrrRangeIndex = crrRangeIndex;
    let newTodayRange = todayRange;

    if (+firstRangeStartYear > crrDisplayedYear) {
      // push new ranges at the start of ranges
      let newFirstRangeStartYear = +firstRangeStartYear;

      while (+newFirstRangeStartYear > crrDisplayedYear) {
        newRanges.unshift(
          `${newFirstRangeStartYear - YEARS_RANGE_SIZE}-${newFirstRangeStartYear - 1}`
        );

        newFirstRangeStartYear -= YEARS_RANGE_SIZE;
      }

      newCrrRangeIndex = 0;
    }

    // push new ranges at the end of ranges
    if (+lastRangeEndYear < crrDisplayedYear) {
      let newLastRangeEndYear = +lastRangeEndYear;

      while (+newLastRangeEndYear < crrDisplayedYear) {
        newRanges.push(`${+newLastRangeEndYear + 1}-${newLastRangeEndYear + YEARS_RANGE_SIZE}`);

        newLastRangeEndYear += YEARS_RANGE_SIZE;
      }

      newCrrRangeIndex = newRanges.length - 1;
    }

    // search for range containing crrDisplayedYear and set it as current range
    if (crrDisplayedYear >= +firstRangeStartYear && crrDisplayedYear <= +lastRangeEndYear) {
      for (const [i, range] of newRanges.entries()) {
        const [start, end] = range.split('-');

        if (crrDisplayedYear >= +start && crrDisplayedYear <= +end) {
          newCrrRangeIndex = i;

          break;
        }
      }
    }

    // update todayRange if it doesnt include todayYear anymore
    const [todayRangeStartYear, todayRangeEndYear] = todayRange.split('-');
    if (!(todayYear >= +todayRangeStartYear && todayYear <= +todayRangeEndYear)) {
      for (const range of newRanges) {
        const [start, end] = range.split('-');

        if (todayYear >= +start && todayYear <= +end) {
          newTodayRange = range;

          break;
        }
      }
    }

    // update store
    store.update((values) => ({
      ...values,
      ranges: newRanges,
      crrRangeIndex: newCrrRangeIndex,
      todayRange: newTodayRange
    }));
  };

  return {
    addNewRange,
    updateRanges,
    updateCrrRangeIndex,
    selectOrCreateRanges,
    ...store
  };
}

const todayStore = writable<moment.Moment>(window.moment());
const displayedDateStore = writable<moment.Moment>(window.moment());
const yearsRanges = createYearsRangesStore();

export { displayedDateStore, todayStore, yearsRanges };
