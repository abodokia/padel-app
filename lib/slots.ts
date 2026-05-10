/** First slot starts at 09:00; last slot is 21:00–22:00. */
export const SLOT_START_HOUR = 9;
export const SLOT_END_HOUR_EXCLUSIVE = 22;

export type SlotInfo = {
  hour: number;
  label: string;
  /** ISO local end time for this slot on the given calendar day */
  endAt: Date;
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatHourRange(hour: number) {
  return `${pad2(hour)}:00 – ${pad2(hour + 1)}:00`;
}

export function getSlotsForDay(day: Date): SlotInfo[] {
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  const slots: SlotInfo[] = [];
  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR_EXCLUSIVE; hour++) {
    slots.push({
      hour,
      label: formatHourRange(hour),
      endAt: new Date(y, m, d, hour + 1, 0, 0, 0),
    });
  }
  return slots;
}

export function slotStartDate(day: Date, hour: number) {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hour,
    0,
    0,
    0,
  );
}
