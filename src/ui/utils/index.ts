import { Platform, setIcon } from 'obsidian';

export type { IMonth, IWeek } from '@/calendar-locale';

export function isControlPressed(e: MouseEvent | KeyboardEvent): boolean {
  return Platform.isMacOS ? e.metaKey : e.ctrlKey;
}

export function isWeekend(date: moment.Moment): boolean {
  return date.isoWeekday() === 6 || date.isoWeekday() === 7;
}

export function getStartOfWeek(days: moment.Moment[]): moment.Moment {
  return days[0];
}

type IYears = [number, number, number];
type IYearsGroup = [IYears, IYears, IYears, IYears];
export function getYears({ startRangeYear }: { startRangeYear: number }): IYearsGroup {
  let crrRangeYear = startRangeYear;
  const COLUMNS = 3;
  const ROWS = 4;
  const years: IYearsGroup = Array.from({ length: ROWS }, () =>
    Array(COLUMNS).fill(0) as 0[]
  ) as IYearsGroup;

  for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
    for (let colIndex = 0; colIndex < COLUMNS; colIndex++) {
      years[rowIndex][colIndex] = crrRangeYear;
      crrRangeYear++;
    }
  }

  return years;
}

/**
    * example: [['Notice first part'], ['second part', 'u-pop'], ...]
    */
export function genNoticeFragment(mssgFragments: ([string] | [string, string] | null)[]) {
  const fragment = document.createDocumentFragment();
  for (const mssg of mssgFragments) {
    if (mssg) {
      const mssgSpan = document.createElement('span');
      mssgSpan.textContent = mssg[0];
      mssgSpan.className = mssg[1] || "";
      fragment.appendChild(mssgSpan);
    }
  }

  return fragment;
}

export const useIcon = (node: HTMLElement, iconId: string) => {
  setIcon(node, iconId);

  return {
    update(newIconId: string) {
      setIcon(node, newIconId);
    },
  };
};

export * from './cn';
export * from './event-handlers';
export * from './picker';

