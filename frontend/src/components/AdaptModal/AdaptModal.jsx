import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../api'
import s from './AdaptModal.module.css'

const TYPES = [
  { id: 'sick', label: '🤒 I\'m sick', desc: 'Rest replaces all sessions; volume reduced the week after.' },
  { id: 'travel', label: '✈️ I\'m traveling', desc: 'Sessions adapted to available equipment (bodyweight, hotel gym).' },
  { id: 'injury', label: '🩹 I\'m injured', desc: 'Affected sessions removed; unaffected ones kept.' },
]

const today = new Date().toISOString().split('T')[0]

export default function AdaptModal({ planId, onClose, onAdapted }) {
  const [type, setType] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [details, setDetails] = useState('')

  const mutation = useMutation({
    mutationFn: (data) => api.adaptPlan(data),
    onSuccess: onAdapted,
  })

  const handleSubmit = () => {
    mutation.mutate({ plan_id: Number(planId), type, start_date: startDate, end_date: endDate, details })
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.card} onClick={e => e.stopPropagation()}>
        <button className={s.close} onClick={onClose}>✕</button>
        <h2 className={s.title}>Adapt My Plan</h2>
        <p className={s.subtitle}>Tell us what's happening — Claude will adjust your upcoming sessions.</p>

        <label className={s.label}>What happened?</label>
        <div className={s.types}>
          {TYPES.map(t => (
            <button key={t.id} className={`${s.typeBtn} ${type === t.id ? s.active : ''}`} onClick={() => setType(t.id)}>
              <span className={s.typeLabel}>{t.label}</span>
              <span className={s.typeDesc}>{t.desc}</span>
            </button>
          ))}
        </div>

        <div className={s.dates}>
          <div>
            <label className={s.label}>From</label>
            <input className={s.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={s.label}>To</label>
            <input className={s.input} type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <label className={s.label}>Additional details (optional)</label>
        <textarea className={s.textarea} rows={3} placeholder={
          type === 'injury' ? 'e.g. left knee pain, can\'t run but can swim and bike' :
          type === 'travel' ? 'e.g. hotel with treadmill and gym' :
          'e.g. fever and sore throat'
        } value={details} onChange={e => setDetails(e.target.value)} />

        {mutation.error && <p className={s.error}>{mutation.error.message}</p>}

        <button className={s.submit} disabled={!type || !startDate || !endDate || mutation.isPending} onClick={handleSubmit}>
          {mutation.isPending ? '⏳ Adapting your plan…' : 'Adapt Plan →'}
        </button>
        {mutation.isPending && <p className={s.hint}>Claude is rewriting your affected sessions. This takes ~10 seconds.</p>}
      </div>
    </div>
  )
}
