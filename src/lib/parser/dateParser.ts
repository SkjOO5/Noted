export interface ParseResult {
  date: Date;
  endDate?: Date;
  timeConfirmed: boolean;
  allDay?: boolean;
  isPast?: boolean;
  confidence: number;
  matchedText: string;
  alternate?: {
    date: Date;
    timeConfirmed: boolean;
  };
}

export function parseDate(_text: string, _referenceDate: Date): ParseResult[] {
  if (!_referenceDate) {
    throw new Error('referenceDate is mandatory');
  }
  return [];
}
