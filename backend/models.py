import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    goals = relationship("Goal", back_populates="user")
    profile = relationship("Profile", back_populates="user", uselist=False)
    plans = relationship("Plan", back_populates="user")


class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    race_type = Column(String, nullable=False)
    race_date = Column(Date, nullable=False)
    user = relationship("User", back_populates="goals")
    plans = relationship("Plan", back_populates="goal")


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    age = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    experience_level = Column(String)  # beginner / intermediate / advanced
    days_per_week = Column(Integer)
    session_duration_min = Column(Integer)
    equipment = Column(Text)  # JSON list
    injuries = Column(Text)
    terrain = Column(String)  # trail / road / mix
    user = relationship("User", back_populates="profile")

    @property
    def equipment_list(self):
        return json.loads(self.equipment) if self.equipment else []

    @equipment_list.setter
    def equipment_list(self, value):
        self.equipment = json.dumps(value)


class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="plans")
    goal = relationship("Goal", back_populates="plans")
    sessions = relationship("Session", back_populates="plan", cascade="all, delete-orphan")
    adapt_events = relationship("AdaptEvent", back_populates="plan", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String, nullable=False)  # run/bike/swim/strength/mobility/rest
    phase = Column(String)  # initial/progression/taper/recovery
    title = Column(String, nullable=False)
    description = Column(Text)
    duration_min = Column(Integer)
    distance_km = Column(Float)
    intensity = Column(String)  # easy/moderate/hard
    plan = relationship("Plan", back_populates="sessions")
    log = relationship("SessionLog", back_populates="session", uselist=False, cascade="all, delete-orphan")


class SessionLog(Base):
    __tablename__ = "session_logs"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), unique=True, nullable=False)
    status = Column(String, nullable=False)  # done / skipped
    rpe = Column(Integer)  # 1-10
    notes = Column(Text)
    logged_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("Session", back_populates="log")


class AdaptEvent(Base):
    __tablename__ = "adapt_events"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    type = Column(String, nullable=False)  # sick / travel / injury
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    plan = relationship("Plan", back_populates="adapt_events")
