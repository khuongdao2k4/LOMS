"use client"

import { useEffect, useState } from "react"
import "../styles/components/mini-calendar.css"

export default function MiniCalendar({ onDateSelect, selectedDate }) {
  const today = new Date()
  const initialDate = selectedDate ? new Date(selectedDate) : today
  const [currentDate, setCurrentDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  )

  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    }
  }, [selectedDate])

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)

  const monthName = currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  const days = []
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

  for (let i = 0; i < adjustedFirstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = (day) => {
    if (day) {
      const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      if (onDateSelect) {
        onDateSelect(selectedDate)
      }
    }
  }

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

  const referenceDate = selectedDate ? new Date(selectedDate) : today
  const isToday = (day) => {
    return (
      day &&
      day === referenceDate.getDate() &&
      currentDate.getMonth() === referenceDate.getMonth() &&
      currentDate.getFullYear() === referenceDate.getFullYear()
    )
  }

  return (
    <div className="mini-calendar-container">
      <div className="mini-calendar-header">
        <h3 className="mini-calendar-month">{capitalizedMonthName}</h3>
        <div className="mini-calendar-nav">
          <button className="mini-calendar-btn" onClick={handlePrevMonth}>
          <i class="fa-solid fa-angle-left"></i>
          </button>
          <button className="mini-calendar-btn" onClick={handleNextMonth}>
          <i class="fa-solid fa-angle-right"></i>
          </button>
        </div>
      </div>

      <div className="mini-calendar-weekdays">
        {weekDays.map((day) => (
          <div key={day} className="mini-calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="mini-calendar-grid">
        {days.map((day, index) => (
          <div
            key={index}
            className={`mini-calendar-day ${day ? "active" : "empty"} ${isToday(day) ? "today" : ""}`}
            onClick={() => handleDayClick(day)}
            style={{ cursor: day ? "pointer" : "default" }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  )
}
