"use client"

import { useEffect, useMemo, useState } from "react"
import "../styles/modals/booking-form-modal.css"

function toDateInputValue(date) {
  if (!date) return ""
  const tzOffset = date.getTimezoneOffset() * 60000
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
  return localISOTime
}

export default function BookingFormModal({
  isOpen,
  slotLabel,
  defaultStart,
  defaultEnd,
  intervalStart,
  intervalEnd,
  minDuration,
  maxDuration,
  onSubmit,
  onClose,
}) {
  const [start, setStart] = useState(defaultStart || "")
  const [end, setEnd] = useState(defaultEnd || "")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  const minMinutes = minDuration || 30
  const maxMinutes = maxDuration || 120

  useEffect(() => {
    setStart(defaultStart || "")
    setEnd(defaultEnd || "")
    setFullName("")
    setPhone("")
    setNote("")
  }, [defaultStart, defaultEnd, isOpen])

  const intervalStartISO = useMemo(() => toDateInputValue(intervalStart), [intervalStart])
  const intervalEndISO = useMemo(() => toDateInputValue(intervalEnd), [intervalEnd])

  if (!isOpen) return null

  const validate = () => {
    setError("")
    if (!start || !end) {
      setError("Vui lòng chọn thời gian")
      return false
    }
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ tên")
      return false
    }
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại")
      return false
    }
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      setError("Thời gian không hợp lệ")
      return false
    }
    if (s >= e) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu")
      return false
    }
    if (intervalStart && s < intervalStart) {
      setError("Không được đặt trước khung giờ")
      return false
    }
    if (intervalEnd && e > intervalEnd) {
      setError("Không được đặt quá khung giờ")
      return false
    }
    const duration = (e.getTime() - s.getTime()) / 60000
    if (duration < minMinutes) {
      setError(`Thời gian đặt tối thiểu ${minMinutes} phút`)
      return false
    }
    if (duration > maxMinutes) {
      setError(`Thời gian đặt tối đa ${maxMinutes} phút`)
      return false
    }
    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit?.({
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
      full_name: fullName,
      phone,
      note,
    })
  }

  return (
    <div className="booking-form-modal__overlay" onClick={onClose}>
      <div className="booking-form-modal__container" onClick={(e) => e.stopPropagation()}>
        <div className="booking-form-modal__header">
          <div>
            <h3 className="booking-form-modal__title">Book khung giờ</h3>
            {slotLabel ? <p className="booking-form-modal__subtitle">{slotLabel}</p> : null}
          </div>
          <button className="booking-form-modal__close" onClick={onClose}>
          <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form-modal__body">
          {error && <div className="booking-form-modal__error">{error}</div>}
          <div className="booking-form-modal__field">
            <label>Bắt đầu</label>
            <input
              type="datetime-local"
              value={start ? toDateInputValue(new Date(start)) : ""}
              min={intervalStartISO}
              max={intervalEndISO}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="booking-form-modal__field">
            <label>Kết thúc</label>
            <input
              type="datetime-local"
              value={end ? toDateInputValue(new Date(end)) : ""}
              min={intervalStartISO}
              max={intervalEndISO}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="booking-form-modal__field">
            <label>Họ tên</label>
            <input
              type="text"
              required
              placeholder="Tên khách"
              name="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="booking-form-modal__field">
            <label>Số điện thoại</label>
            <input
              type="tel"
              required
              placeholder="Số liên hệ"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="booking-form-modal__field">
            <label>Ghi chú</label>
            <textarea
              placeholder="Thông tin sản phẩm (không bắt buộc)"
              name="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="booking-form-modal__hint">
            Thời lượng tối thiểu {minMinutes} phút, tối đa {maxMinutes} phút, không vượt quá khung giờ được chọn.
          </div>
          <div className="booking-form-modal__actions">
            <button type="button" className="booking-form-modal__btn ghost" onClick={onClose}>
              Huỷ
            </button>
            <button type="submit" className="booking-form-modal__btn primary">
              Gửi yêu cầu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
