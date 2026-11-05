"use strict";

function getRemainingPerformances(events, now) {
  if (!Number.isFinite(now)) throw new Error("Invalid schedule time.");
  return events.filter(event => {
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(event.end);
    if (!match) throw new Error(`Invalid performance end time: ${event.end}`);
    const [, year, month, day, hour, minute, second] = match;
    const end = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
    const expected = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
    if (new Date(end).toISOString() !== expected) {
      throw new Error(`Invalid performance end time: ${event.end}`);
    }
    return now < end;
  });
}
