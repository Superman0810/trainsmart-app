import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api'
import s from './Onboarding.module.css'

const RACE_TYPES = ['5K', '10K', 'Half Marathon', 'Marathon', 'Triathlon Sprint', 'Triathlon Olympic', 'Ironman', 'Custom']
const EQUIPMENT = ['Gym', 'Bike', 'Swimming Pool', 'Home Weights', 'Treadmill', 'Resistance Bands']
const EXPERIENCE = ['beginner', 'intermediate', 'advanced']

const STEPS = ['Your Goal', 'Race Date', 'About You', 'Availability', 'Equipment', 'Health Notes']

const today = new Date().toISOString().split('T')[0]
const minDate = new Date()
minDate.setDate(minDate.getDate() + 28)
const MIN_DATE = minDate.toISOString().split('T')[0]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    race_type: '',
    race_date: '',
    age: '',
    weight_kg: '',
    height_cm: '',
    experience_level: 'beginner',
    days_per_week: 4,
    session_duration_min: 60,
    equipment: [],
    injuries: '',
    terrain: 'road',
  })

  const mutation = useMutation({
    mutationFn: api.generatePlan,
    onSuccess: (data) => navigate(`/dashboard/${data.id}`),
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleEquipment = (item) =>
    set('equipment', form.equipment.includes(item)
      ? form.equipment.filter(e => e !== item)
      : [...form.equipment, item])

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.race_type
    if (step === 1) return form.race_date
    if (step === 2) return form.age && form.weight_kg && form.height_cm
    if (step === 3) return form.days_per_week && form.session_duration_min
    return true
  }

  const handleSubmit = () => {
    mutation.mutate({
      ...form,
      age: Number(form.age),
      weight_kg: Number(form.weight_kg),
      height_cm: Number(form.height_cm),
      days_per_week: Number(form.days_per_week),
      session_duration_min: Number(form.session_duration_min),
    })
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.progress}>
          {STEPS.map((label, i) => (
            <div key={label} className={`${s.dot} ${i <= step ? s.active : ''}`} title={label} />
          ))}
        </div>
        <p className={s.stepLabel}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

        {step === 0 && (
          <div className={s.section}>
            <label className={s.label}>Your name</label>
            <input className={s.input} placeholder="e.g. Henry" value={form.name} onChange={e => set('name', e.target.value)} />
            <label className={s.label}>What's your goal race?</label>
            <div className={s.chips}>
              {RACE_TYPES.map(r => (
                <button key={r} className={`${s.chip} ${form.race_type === r ? s.chipActive : ''}`} onClick={() => set('race_type', r)}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={s.section}>
            <label className={s.label}>Race date</label>
            <input className={s.input} type="date" min={MIN_DATE} value={form.race_date} onChange={e => set('race_date', e.target.value)} />
            <p className={s.hint}>Pick a date at least 4 weeks from today so there's time to prepare.</p>
          </div>
        )}

        {step === 2 && (
          <div className={s.section}>
            <div className={s.row}>
              <div>
                <label className={s.label}>Age</label>
                <input className={s.input} type="number" min="10" max="99" placeholder="28" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
              <div>
                <label className={s.label}>Weight (kg)</label>
                <input className={s.input} type="number" min="30" max="200" placeholder="72" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
              </div>
              <div>
                <label className={s.label}>Height (cm)</label>
                <input className={s.input} type="number" min="100" max="230" placeholder="178" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} />
              </div>
            </div>
            <label className={s.label}>Running / endurance experience</label>
            <div className={s.chips}>
              {EXPERIENCE.map(e => (
                <button key={e} className={`${s.chip} ${form.experience_level === e ? s.chipActive : ''}`} onClick={() => set('experience_level', e)}>
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </button>
              ))}
            </div>
            <label className={s.label}>Terrain preference</label>
            <div className={s.chips}>
              {['road', 'trail', 'mix'].map(t => (
                <button key={t} className={`${s.chip} ${form.terrain === t ? s.chipActive : ''}`} onClick={() => set('terrain', t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={s.section}>
            <label className={s.label}>Training days per week: <strong>{form.days_per_week}</strong></label>
            <input className={s.slider} type="range" min="2" max="7" value={form.days_per_week} onChange={e => set('days_per_week', e.target.value)} />
            <div className={s.sliderLabels}><span>2</span><span>7</span></div>
            <label className={s.label}>Typical session length: <strong>{form.session_duration_min} min</strong></label>
            <input className={s.slider} type="range" min="30" max="180" step="15" value={form.session_duration_min} onChange={e => set('session_duration_min', e.target.value)} />
            <div className={s.sliderLabels}><span>30 min</span><span>3 h</span></div>
          </div>
        )}

        {step === 4 && (
          <div className={s.section}>
            <label className={s.label}>Available equipment (select all that apply)</label>
            <div className={s.chips}>
              {EQUIPMENT.map(e => (
                <button key={e} className={`${s.chip} ${form.equipment.includes(e) ? s.chipActive : ''}`} onClick={() => toggleEquipment(e)}>{e}</button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className={s.section}>
            <label className={s.label}>Past injuries or current limitations</label>
            <textarea className={s.textarea} rows={4} placeholder="e.g. left knee tendinitis, recovered. Lower back occasionally tight." value={form.injuries} onChange={e => set('injuries', e.target.value)} />
            <p className={s.hint}>Leave blank if none. The more specific, the better the plan.</p>
          </div>
        )}

        {mutation.error && <p className={s.error}>{mutation.error.message}</p>}

        <div className={s.actions}>
          {step > 0 && !mutation.isPending && (
            <button className={s.back} onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button className={s.next} disabled={!canNext()} onClick={() => setStep(s => s + 1)}>Next →</button>
          ) : (
            <button className={s.next} disabled={mutation.isPending} onClick={handleSubmit}>
              {mutation.isPending ? 'Generating your plan…' : 'Build My Plan 🚀'}
            </button>
          )}
        </div>

        {mutation.isPending && (
          <p className={s.generating}>Claude is designing your personalized training plan. This takes about 15–30 seconds…</p>
        )}
      </div>
    </div>
  )
}
