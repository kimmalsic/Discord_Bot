import {
  format,
  formatDistanceToNow,
  differenceInDays,
  parseISO,
  isValid,
  startOfDay,
  addDays,
  isBefore,
  isAfter,
  isSameDay,
} from 'date-fns'
import { ko } from 'date-fns/locale'

// 한국어 날짜 포맷
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '유효하지 않은 날짜'
  return format(d, 'yyyy년 M월 d일', { locale: ko })
}

// 한국어 날짜+시간 포맷
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '유효하지 않은 날짜'
  return format(d, 'yyyy년 M월 d일 HH:mm', { locale: ko })
}

// 상대 시간 (예: 3일 전, 2시간 후)
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '유효하지 않은 날짜'
  return formatDistanceToNow(d, { addSuffix: true, locale: ko })
}

// D-Day 계산 (예: D-7, D+3)
export function getDDay(targetDate: Date | string): string {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate
  if (!isValid(target)) return '유효하지 않은 날짜'

  const today = startOfDay(new Date())
  const targetDay = startOfDay(target)
  const diff = differenceInDays(targetDay, today)

  if (diff === 0) return 'D-Day'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

// 남은 일수 계산
export function getDaysRemaining(targetDate: Date | string): number {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate
  if (!isValid(target)) return 0

  const today = startOfDay(new Date())
  const targetDay = startOfDay(target)
  return differenceInDays(targetDay, today)
}

// 지연 여부 확인
export function isDelayed(targetDate: Date | string): boolean {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate
  if (!isValid(target)) return false

  return isBefore(startOfDay(target), startOfDay(new Date()))
}

// D-N 알림 대상인지 확인
export function isDaysBefore(targetDate: Date | string, days: number): boolean {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate
  if (!isValid(target)) return false

  const today = startOfDay(new Date())
  const notificationDate = addDays(today, days)

  return isSameDay(startOfDay(target), notificationDate)
}

// 날짜 문자열 파싱 (YYYY-MM-DD 형식)
export function parseDateString(dateStr: string): Date | null {
  const parsed = parseISO(dateStr)
  return isValid(parsed) ? parsed : null
}

// 기간 형식화 (예: 2024.01.01 ~ 2024.12.31)
export function formatPeriod(startDate: Date, endDate: Date): string {
  const start = format(startDate, 'yyyy.MM.dd')
  const end = format(endDate, 'yyyy.MM.dd')
  return `${start} ~ ${end}`
}

// 진행률 계산 (기간 기준)
export function calculateProgress(startDate: Date, endDate: Date): number {
  const today = new Date()
  const totalDays = differenceInDays(endDate, startDate)
  const elapsedDays = differenceInDays(today, startDate)

  if (totalDays <= 0) return 100
  if (elapsedDays <= 0) return 0
  if (elapsedDays >= totalDays) return 100

  return Math.round((elapsedDays / totalDays) * 100)
}
