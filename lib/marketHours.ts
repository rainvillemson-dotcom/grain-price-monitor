// MATIF/Euronext Paris kauplemisajad CET/CEST ajavööndis

function getParisTime(): { hours: number; minutes: number; weekday: number } {
  const now = new Date()
  // Kasuta Intl API et saada Paris aeg korrektse suve/talveajaga
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'narrow',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'

  let hours = parseInt(get('hour'), 10)
  // Intl võib tagastada 24 keskööl — normaliseeri
  if (hours === 24) hours = 0
  const minutes = parseInt(get('minute'), 10)
  // narrow weekday: M T W T F S S (inglise)
  const weekdayChar = get('weekday')
  const weekdayMap: Record<string, number> = { M: 1, T: 2, W: 3, F: 5, S: 6 }
  // T on nii Tuesday (2) kui Thursday (4) — kasuta Date.getDay UTC+Paris offset
  const jsDay = new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now)
  ).getDay() // 0=Sun, 1=Mon...
  // Ohutu fallback: kasuta jsDay
  const weekday = jsDay

  return { hours, minutes, weekday }
}

// MATIF põhisessioon: E–R 10:45–18:30 CET (aktiivne kauplemisperiood)
// Elektrooniline sessioon kuni 20:15, aga likviidsus väike peale 18:30
// Kasutame 10:45–20:15 et kuvada "avatud" staatust

export function isMarketOpen(): boolean {
  const { hours, minutes, weekday } = getParisTime()
  const isWeekday = weekday >= 1 && weekday <= 5
  const totalMin = hours * 60 + minutes
  const openMin = 10 * 60 + 45   // 10:45
  const closeMin = 20 * 60 + 15  // 20:15
  return isWeekday && totalMin >= openMin && totalMin < closeMin
}

export function getRefreshInterval(): number {
  return isMarketOpen() ? 15 * 60 * 1000 : 60 * 60 * 1000
}

export function getMarketStatusText(): {
  isOpen: boolean
  label: string
  detail: string
} {
  const { hours, minutes, weekday } = getParisTime()
  const isWeekday = weekday >= 1 && weekday <= 5
  const isOpen = isMarketOpen()
  const totalMin = hours * 60 + minutes

  if (isOpen) {
    return {
      isOpen: true,
      label: 'Börs avatud',
      detail: 'MATIF · 15-min hilinemine',
    }
  }

  const DAYS_ET: Record<number, string> = { 0: 'P', 1: 'E', 2: 'T', 3: 'K', 4: 'N', 5: 'R', 6: 'L' }

  if (!isWeekday) {
    const nextMonday = weekday === 0 ? 1 : (7 - weekday + 1) % 7
    const openDay = DAYS_ET[weekday === 6 ? 1 : 1]
    return {
      isOpen: false,
      label: 'Börs suletud',
      detail: `Nädalavahetus · Avatud ${openDay} 10:45`,
    }
  }

  // Argipäev, aga börs suletud
  if (totalMin < 10 * 60 + 45) {
    return {
      isOpen: false,
      label: 'Börs suletud',
      detail: `Avab täna ${DAYS_ET[weekday]} 10:45`,
    }
  }

  // Peale sulgemist
  const nextDay = weekday === 5 ? 'E' : DAYS_ET[(weekday + 1) % 7]
  return {
    isOpen: false,
    label: 'Börs suletud',
    detail: `Suljeti 20:15 · Avab ${nextDay} 10:45`,
  }
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '…'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}
