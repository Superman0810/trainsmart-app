import { useNavigate } from 'react-router-dom'
import s from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className={s.page}>
      <div className={s.hero}>
        <h1 className={s.title}>TrainSmart</h1>
        <p className={s.subtitle}>Your adaptive training plan — powered by AI</p>
        <p className={s.desc}>
          Tell us your goal. We build a full training plan with phases, strength, mobility,
          and nutrition — and adapt it when life gets in the way.
        </p>
        <button className={s.cta} onClick={() => navigate('/onboarding')}>
          Build My Plan →
        </button>
      </div>

      <div className={s.features}>
        {[
          { icon: '🎯', title: 'Goal-based', desc: '5K, 10K, Half Marathon, Marathon, Triathlon — any distance.' },
          { icon: '🔄', title: 'Adaptive', desc: 'Sick, traveling, or injured? The plan adjusts automatically.' },
          { icon: '📊', title: 'Export', desc: 'Download your full plan as Excel or PDF.' },
          { icon: '💬', title: 'Feedback loop', desc: 'Log each session — the plan learns and adjusts.' },
        ].map(f => (
          <div key={f.title} className={s.card}>
            <span className={s.icon}>{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
