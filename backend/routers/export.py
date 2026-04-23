from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_db
from models import Plan
from services.export_service import generate_excel, generate_pdf_html

router = APIRouter(prefix="/export", tags=["export"])


def _plan_to_sessions_dict(plan: Plan) -> list[dict]:
    return [
        {
            "week_number": s.week_number,
            "date": s.date,
            "type": s.type,
            "phase": s.phase,
            "title": s.title,
            "description": s.description,
            "duration_min": s.duration_min,
            "distance_km": s.distance_km,
            "intensity": s.intensity,
        }
        for s in sorted(plan.sessions, key=lambda x: x.date)
    ]


@router.get("/{plan_id}/excel")
def export_excel(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    data = generate_excel(_plan_to_sessions_dict(plan))
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=training_plan_{plan_id}.xlsx"},
    )


@router.get("/{plan_id}/pdf")
def export_pdf(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan_meta = {
        "name": plan.user.name,
        "race_type": plan.goal.race_type,
        "race_date": plan.goal.race_date.strftime("%B %d, %Y"),
    }
    html = generate_pdf_html(_plan_to_sessions_dict(plan), plan_meta)

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=training_plan_{plan_id}.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
