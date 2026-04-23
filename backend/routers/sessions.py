from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Session as TrainingSession, SessionLog, Plan
from schemas import SessionLogRequest
from services import claude_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/{session_id}/log")
def log_session(session_id: int, data: SessionLogRequest, db: Session = Depends(get_db)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.log:
        session.log.status = data.status
        session.log.rpe = data.rpe
        session.log.notes = data.notes
    else:
        log = SessionLog(session_id=session_id, status=data.status, rpe=data.rpe, notes=data.notes)
        db.add(log)

    db.commit()

    logged_count = (
        db.query(SessionLog)
        .join(TrainingSession)
        .filter(TrainingSession.plan_id == session.plan_id)
        .count()
    )
    if logged_count >= 2 and logged_count % 7 == 0:
        _auto_tune(session.plan_id, db)

    return {"ok": True}


def _auto_tune(plan_id: int, db: Session):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    today = date.today()
    next_week_end = today + timedelta(days=7)

    upcoming = [
        s for s in plan.sessions
        if today <= s.date <= next_week_end
    ]
    if not upcoming:
        return

    recent_logs = [
        s.log for s in plan.sessions
        if s.log and s.date >= today - timedelta(days=14)
    ]
    if not recent_logs:
        return

    rpe_values = [l.rpe for l in recent_logs if l.rpe]
    avg_rpe = sum(rpe_values) / len(rpe_values) if rpe_values else None
    notes = [l.notes for l in recent_logs if l.notes]
    feedback_summary = f"Average RPE over last 14 days: {avg_rpe:.1f}/10." if avg_rpe else ""
    if notes:
        feedback_summary += f" Recent notes: {'; '.join(notes[-3:])}"

    upcoming_dict = [
        {
            "week_number": s.week_number,
            "date": s.date.isoformat(),
            "type": s.type,
            "phase": s.phase,
            "title": s.title,
            "description": s.description,
            "duration_min": s.duration_min,
            "distance_km": s.distance_km,
            "intensity": s.intensity,
            "id": s.id,
        }
        for s in upcoming
    ]

    tuned = claude_service.tune_from_feedback(upcoming_dict, feedback_summary)
    id_map = {s.id: s for s in upcoming}
    for t in tuned:
        if t.get("id") and t["id"] in id_map:
            s = id_map[t["id"]]
            s.duration_min = t.get("duration_min", s.duration_min)
            s.distance_km = t.get("distance_km", s.distance_km)
            s.intensity = t.get("intensity", s.intensity)
            s.description = t.get("description", s.description)

    db.commit()
