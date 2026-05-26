const APP_TIME_ZONE = 'Europe/Tallinn'

function getParts(
  value: Date,
  timeZone: string
): { year: string; month: string; day: string; hour: string; minute: string; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(value)

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? ''

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    weekday: read('weekday'),
  }
}

export function isoDateInAppZone(value: Date = new Date()): string {
  const { year, month, day } = getParts(value, APP_TIME_ZONE)
  return `${year}-${month}-${day}`
}

export function formatIsoDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(`${value}T00:00:00Z`)
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date)
}

export function formatIsoDateTimeUtc(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  const date = new Date(`${value}:00Z`)
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date)
}

