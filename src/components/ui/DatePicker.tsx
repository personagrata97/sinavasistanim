import { useState } from "react"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns"
import { tr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  placeholder?: string
}

export function DatePicker({ value, onChange, placeholder = "Tarih seçin..." }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Parse incoming value or default to today
  const selectedDate = value ? new Date(value) : null
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const dateFormat = "yyyy-MM-dd"
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  
  const weekDays = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const onDateClick = (day: Date) => {
    onChange(format(day, dateFormat))
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Input / Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15] cursor-pointer transition-all flex items-center"
      >
        <CalendarIcon className="absolute left-4 w-5 h-5 text-indigo-400" />
        <span className={selectedDate ? "text-white font-medium" : "text-slate-500"}>
          {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: tr }) : placeholder}
        </span>
      </div>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close when clicking outside */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 mt-2 z-50 p-4 rounded-2xl bg-[#0f1523] border border-white/[0.08] shadow-2xl shadow-black/50 w-80 backdrop-blur-xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={prevMonth}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-bold text-white capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: tr })}
                </div>
                <button 
                  onClick={nextMonth}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-[10px] font-bold text-slate-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                  const isCurrentMonth = isSameMonth(day, monthStart)
                  const isDayToday = isToday(day)

                  let btnClass = "w-9 h-9 mx-auto rounded-full flex items-center justify-center text-sm transition-all duration-200 "
                  
                  if (isSelected) {
                    btnClass += "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30"
                  } else if (isDayToday) {
                    btnClass += "bg-white/10 text-indigo-300 font-bold hover:bg-white/20"
                  } else if (isCurrentMonth) {
                    btnClass += "text-slate-300 hover:bg-white/10 hover:text-white"
                  } else {
                    btnClass += "text-slate-600 hover:bg-white/5"
                  }

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => onDateClick(day)}
                      className={btnClass}
                    >
                      {format(day, "d")}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
