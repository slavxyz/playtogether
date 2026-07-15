export function splitDateTime(value: string): { date: string; time: string } {
  const [date = '', time = ''] = value.split('T')
  return { date, time }
}

export function combineDateTime(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '00:00'}`
}

export function todayLocalDate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
