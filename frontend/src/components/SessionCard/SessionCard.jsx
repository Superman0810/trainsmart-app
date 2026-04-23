import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { api } from '../../api'
import s from './SessionCard.module.css'

const TYPE_COLORS = { run: '#16a34a', bike: '#2563eb', swim: '#0891b2', strength: '#d97706', mobility: '#7c3aed', rest: '#94a3b8' }

export default function SessionCard({ session, onClose, onLogged }) {
  const [status, setStatus] = useState(session.log?.status || '')
  const [rpe, setRpe] = useState(session.log?.rpe || 5)
  const [notes, setNotes] = useState(session.log?.notes || '')

  const mutation = useMutation({
    mutationFn: (data) => api.logSession(session.id, data),
    onSuccess: onLogged,
  })

  const handleLog = (s) => {
    setStatus(s)
    mutation.mutate({ status: s, rpe, notes })
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.card} onClick={e => e.stopPropagation()}>
        <button className={s.close} onClick={onClose}>✕</button>

        <div className={s.typeTag} style={{ color: TYPE_COLORS[session.type] || '#94a3b8' }}>
          {session.type.toUpperCase()} · {format(parseISO(session.date), 'EEEE, MMMM d')}
        </div>
        <h2 className={s.title}>{session.title}</h2>

        <div className={s.meta}>
          {session.duration_min && <span>⏱ {session.duration_min} min</span>}
          {session.distance_km && <span>📍 {session.distance_km} km</span>}
          {session.intensity && <span className={s.intensity} data-intensity={session.intensity}>{session.intensity}</span>}
          {session.phase && <span>📅 {session.phase} phase</span>}
        </div>

        {session.description && <p className={s.desc}>{session.description}</p>}

        <div className={s.divider} />

        <div className={s.logSection}>
          <h3 className={s.logTitle}>Log this session</h3>

          {(status !== 'skipped') && (
            <>
              <label className={s.label}>Effort (RPE): <strong>{rpe}/10</strong></label>
              <input className={s.slider} type="range" min="1" max="10" value={rpe} onChange={e => setRpe(Number(e.target.value))} />
              <div className={s.rpeLabels}><span>Very easy</span><span>Max effort</span></div>
            </>
          )}

          <label className={s.label}>Notes (optional)</label>
          <textarea className={s.notes} rows={3} placeholder="How did it feel? Any aches?" value={notes} onChange={e => setNotes(e.target.value)} />

          {mutation.error && <p className={s.error}>{mutation.error.message}</p>}

          <div className={s.actions}>
            <button className={s.skipBtn} disabled={mutation.isPending} onClick={() => handleLog('skipped')}>
              Mark as Skipped
            </button>
            <button className={s.doneBtn} disabled={mutation.isPending} onClick={() => handleLog('done')}>
              {mutation.isPending ? 'Saving…' : '✓ Mark as Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
