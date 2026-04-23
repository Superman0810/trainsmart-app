import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns'
import { api } from '../api'
import SessionCard from '../components/SessionCard/SessionCard'
import AdaptModal from '../components/AdaptModal/AdaptModal'
import s from './Dashboard.module.css'

const PHASE_LABELS = { initial: 'Initial Phase', progression: 'Progression Phase', taper: 'Taper Phase', recovery: 'Recovery Phase' }
const PHASE_COLORS = { initial: '#dbeafe', progression: '#fef3c7', taper: '#f3e8ff', recovery: '#dcfce7' }
const TYPE_COLORS = { run: '#16a34a', bike: '#2563eb', swim: '#0891b2', strength: '#d97706', mobility: '#7c3aed', rest: '#94a3b8' }

function groupByWeek(sessions) {
  const weeks = {}
  for (const s of sessions) {
    weeks[s.week_number] = weeks[s.week_number] || []
    weeks[s.week_number].push(s)
  }
  return weeks
}

export default function Dashboard() {
  const { planId } = useParams()
  const qc = useQueryClient()
  const [selectedSession, setSelectedSession] = useState(null)
  const [showAdapt, setShowAdapt] = useState(false)
  const [viewWeek, setViewWeek] = useState(1)

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => api.getPlan(planId),
  })

  if (isLoading) return <div className={s.loading}>Loading your plan…</div>
  if (error) return <div className={s.error}>Error: {error.message}</div>

  const sessions = plan.sessions || []
  const weeks = groupByWeek(sessions)
  const totalWeeks = Math.max(...sessions.map(s => s.week_number), 1)

  const currentWeekSessions = (weeks[viewWeek] || []).sort((a, b) => new Date(a.date) - new Date(b.date))
  const currentPhase = currentWeekSessions[0]?.phase || 'initial'

  const weekStats = {
    total: currentWeekSessions.filter(s => s.type !== 'rest').length,
    done: currentWeekSessions.filter(s => s.log?.status === 'done').length,
    totalKm: currentWeekSessions.reduce((acc, s) => acc + (s.distance_km || 0), 0),
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>Training Plan</h1>
          <p className={s.subtitle} style={{ background: PHASE_COLORS[currentPhase] }}>
            {PHASE_LABELS[currentPhase] || 'Plan'}
          </p>
        </div>
        <div className={s.headerActions}>
          <button className={s.adaptBtn} onClick={() => setShowAdapt(true)}>⚡ Something changed</button>
          <a className={s.exportBtn} href={api.exportExcel(planId)} download>↓ Excel</a>
          <a className={s.exportBtn} href={api.exportPdf(planId)} download>↓ PDF</a>
        </div>
      </header>

      <div className={s.weekNav}>
        <button className={s.navBtn} disabled={viewWeek <= 1} onClick={() => setViewWeek(w => w - 1)}>←</button>
        <span className={s.weekLabel}>Week {viewWeek} of {totalWeeks}</span>
        <button className={s.navBtn} disabled={viewWeek >= totalWeeks} onClick={() => setViewWeek(w => w + 1)}>→</button>
      </div>

      <div className={s.weekStats}>
        <div className={s.stat}><span className={s.statVal}>{weekStats.done}/{weekStats.total}</span><span className={s.statKey}>Sessions done</span></div>
        <div className={s.stat}><span className={s.statVal}>{weekStats.totalKm.toFixed(1)} km</span><span className={s.statKey}>Total volume</span></div>
        <div className={s.stat}><span className={s.statVal}>{currentWeekSessions.filter(s => s.type === 'rest').length}</span><span className={s.statKey}>Rest days</span></div>
      </div>

      <div className={s.calendar}>
        {currentWeekSessions.map(session => (
          <div
            key={session.id}
            className={`${s.sessionTile} ${session.log?.status === 'done' ? s.done : ''} ${session.log?.status === 'skipped' ? s.skipped : ''}`}
            onClick={() => setSelectedSession(session)}
            style={{ borderTop: `4px solid ${TYPE_COLORS[session.type] || '#94a3b8'}` }}
          >
            <div className={s.tileDate}>{format(parseISO(session.date), 'EEE, MMM d')}</div>
            <div className={s.tileType} style={{ color: TYPE_COLORS[session.type] || '#94a3b8' }}>
              {session.type.toUpperCase()}
            </div>
            <div className={s.tileTitle}>{session.title}</div>
            {session.duration_min && <div className={s.tileMeta}>{session.duration_min} min</div>}
            {session.distance_km && <div className={s.tileMeta}>{session.distance_km} km</div>}
            {session.intensity && <div className={s.tileIntensity} data-intensity={session.intensity}>{session.intensity}</div>}
            {session.log?.status && (
              <div className={s.tileStatus}>{session.log.status === 'done' ? '✓ Done' : '✗ Skipped'}</div>
            )}
          </div>
        ))}
      </div>

      <div className={s.phaseOverview}>
        <h3>Phase Overview</h3>
        <div className={s.phaseBar}>
          {Object.entries(groupByWeek(sessions)).map(([week, wSessions]) => {
            const phase = wSessions[0]?.phase || 'initial'
            const doneCount = wSessions.filter(s => s.log?.status === 'done').length
            const total = wSessions.filter(s => s.type !== 'rest').length
            return (
              <div
                key={week}
                className={`${s.phaseWeek} ${Number(week) === viewWeek ? s.phaseWeekActive : ''}`}
                style={{ background: PHASE_COLORS[phase] }}
                onClick={() => setViewWeek(Number(week))}
                title={`Week ${week} — ${PHASE_LABELS[phase]}`}
              >
                <span className={s.phaseWeekNum}>{week}</span>
                {total > 0 && <span className={s.phaseWeekProgress}>{doneCount}/{total}</span>}
              </div>
            )
          })}
        </div>
        <div className={s.phaseLegend}>
          {Object.entries(PHASE_COLORS).map(([phase, color]) => (
            <span key={phase} className={s.legendItem}>
              <span className={s.legendDot} style={{ background: color, border: '1px solid #ccc' }} />
              {PHASE_LABELS[phase]}
            </span>
          ))}
        </div>
      </div>

      {selectedSession && (
        <SessionCard
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onLogged={() => { qc.invalidateQueries(['plan', planId]); setSelectedSession(null) }}
        />
      )}

      {showAdapt && (
        <AdaptModal
          planId={planId}
          onClose={() => setShowAdapt(false)}
          onAdapted={() => { qc.invalidateQueries(['plan', planId]); setShowAdapt(false) }}
        />
      )}
    </div>
  )
}
