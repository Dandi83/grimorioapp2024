/** «14:05», the time of Rome: when the «Modalità solo SRD» was switched on (PROMPT 39). */
export const romeTime = (date: Date) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(date);
