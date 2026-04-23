from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Goal, Profile, Plan, Session as TrainingSession
from schemas import OnboardingRequest, AdaptRequest, PlanOut
from services import claude_service

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("/generate", response_model=PlanOut)
def generate_plan(data: OnboardingRequest, db: Session = Depends(get_db)):
    user = User(name=data.name)
    db.add(user)
    db.flush()

    goal = Goal(user_id=user.id, race_type=data.race_type, race_date=data.race_date)
    db.add(goal)
    db.flush()

    profile = Profile(
        user_id=user.id,
        age=data.age,
        weight_kg=data.weight_kg,
        height_cm=data.height_cm,
        experience_level=data.experience_level,
        days_per_week=data.days_per_week,
        session_duration_min=data.session_duration_min,
        injuries=data.injuries,
        terrain=data.terrain,
    )
    profile.equipment_list = data.equipment
    db.add(profile)
    db.flush()

    plan = Plan(user_id=user.id, goal_id=goal.id)
    db.add(plan)
    db.flush()

    profile_dict = {
        "name": data.name,
        "age": data.age,
        "weight_kg": data.weight_kg,
        "height_cm": data.height_cm,
        "experience_level": data.experience_level,
        "days_per_week": data.days_per_week,
        "session_duration_min": data.session_duration_min,
        "equipment": data.equipment,
        "terrain": data.terrain,
        "injuries": data.injuries,
    }
    goal_dict = {"race_type": data.race_type, "race_date": data.race_date.isoformat()}

    raw_sessions = claude_service.generate_plan(profile_dict, goal_dict)

    for s in raw_sessions:
        session = TrainingSession(
            plan_id=plan.id,
            week_number=s["week_number"],
            date=date.fromisoformat(s["date"]),
            type=s["type"],
            phase=s.get("phase"),
            title=s["title"],
            description=s.get("description"),
            duration_min=s.get("duration_min"),
            distance_km=s.get("distance_km"),
            intensity=s.get("intensity"),
        )
        db.add(session)

    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("/adapt")
def adapt_plan(data: AdaptRequest, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    affected = [
        s for s in plan.sessions
        if s.date >= data.start_date
    ]
    sessions_dict = [
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
        for s in affected
    ]

    event_dict = {
        "type": data.type,
        "start_date": data.start_date.isoformat(),
        "end_date": data.end_date.isoformat(),
        "details": data.details,
    }
    updated = claude_service.adapt_plan(sessions_dict, event_dict)

    id_map = {s.id: s for s in affected}
    for updated_s in updated:
        original_id = updated_s.get("id")
        if original_id and original_id in id_map:
            s = id_map[original_id]
            s.type = updated_s["type"]
            s.phase = updated_s.get("phase", s.phase)
            s.title = updated_s["title"]
            s.description = updated_s.get("description")
            s.duration_min = updated_s.get("duration_min")
            s.distance_km = updated_s.get("distance_km")
            s.intensity = updated_s.get("intensity")

    db.commit()
    db.refresh(plan)
    return plan
