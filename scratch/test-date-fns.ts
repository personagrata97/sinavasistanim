import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'

const today = new Date()
const monthStart = startOfMonth(today)
const monthEnd = endOfMonth(monthStart)
const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

const days = eachDayOfInterval({ start: startDate, end: endDate })
console.log(`Grid has ${days.length} days`)
