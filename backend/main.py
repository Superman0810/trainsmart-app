from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import plans, sessions, export

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Training Plan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plans.router)
app.include_router(sessions.router)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"status": "ok"}
