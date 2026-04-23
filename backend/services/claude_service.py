import json
import os
from datetime import date
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are an expert running and triathlon coach and nutritionist.
You design personalized, adaptive training plans following the 4-phase methodology:
1. Initial Phase — build aerobic base and consistency
2. Progression Phase — add intervals, tempo, hill workouts
3. Taper Phase — reduce load, sharpen for race day
4. Recovery Phase — post-race recovery

Always respond with valid JSON only. No markdown, no prose outside the JSON."""


def _call(messages: list[dict]) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=8192,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
    )
    return response.content[0].text


def generate_plan(profile: dict, goal: dict) -> list[dict]:
    race_date = goal["race_date"]
    today = date.today().isoformat()
    weeks_available = max(4, (date.fromisoformat(race_date) - date.today()).days // 7)

    prompt = f"""Create a complete {weeks_available}-week training plan for this athlete.

ATHLETE PROFILE:
- Name: {profile['name']}
- Age: {profile['age']}, Weight: {profile['weight_kg']}kg, Height: {profile['height_cm']}cm
- Experience: {profile['experience_level']}
- Race goal: {goal['race_type']} on {race_date}
- Training days per week: {profile['days_per_week']}
- Typical session length: {profile['session_duration_min']} minutes
- Available equipment: {', '.join(profile['equipment'])}
- Terrain preference: {profile['terrain']}
- Injuries/limitations: {profile.get('injuries') or 'None'}
- Plan start date: {today}

INSTRUCTIONS:
- Divide the plan into 4 phases proportional to {weeks_available} weeks
- Never increase weekly volume by more than 10%
- Place rest days strategically; never put a leg strength day before a long run
- For triathlon goals include run, bike, and swim sessions
- Include mobility sessions 2-3x per week

Return a JSON array of session objects. Each object must have exactly these fields:
{{
  "week_number": <int 1-{weeks_available}>,
  "date": "<YYYY-MM-DD>",
  "type": "<run|bike|swim|strength|mobility|rest>",
  "phase": "<initial|progression|taper|recovery>",
  "title": "<short title>",
  "description": "<detailed coaching notes for this session>",
  "duration_min": <int or null>,
  "distance_km": <float or null>,
  "intensity": "<easy|moderate|hard|null>"
}}

Generate sessions for all {weeks_available} weeks starting from {today}. Include every day (rest days too).
Return only the JSON array, nothing else."""

    raw = _call([{"role": "user", "content": prompt}])
    return json.loads(raw)


def adapt_plan(sessions: list[dict], event: dict) -> list[dict]:
    prompt = f"""An athlete's training plan needs adaptation due to a life event.

EVENT:
- Type: {event['type']} (sick / travel / injury)
- Period: {event['start_date']} to {event['end_date']}
- Details: {event.get('details') or 'No additional details'}

AFFECTED SESSIONS (only sessions from {event['start_date']} onward are included):
{json.dumps(sessions, indent=2, default=str)}

INSTRUCTIONS:
- Remove or replace sessions during the event period based on type:
  * sick: replace all sessions with rest; reduce load the week after by 20%
  * travel: replace with available alternatives (bodyweight, walking, hotel gym)
  * injury: remove sessions that stress the injured area; keep others
- Redistribute missed volume gently into subsequent weeks (max +10% per week)
- Keep the phase label consistent with the original plan logic
- Return the FULL updated list of sessions (all sessions you received, modified as needed)

Return only a JSON array with the same schema as the input. No explanation."""

    raw = _call([{"role": "user", "content": prompt}])
    return json.loads(raw)


def tune_from_feedback(upcoming_sessions: list[dict], feedback_summary: str) -> list[dict]:
    prompt = f"""Adjust the upcoming training sessions based on recent athlete feedback.

FEEDBACK SUMMARY:
{feedback_summary}

UPCOMING SESSIONS (next 7 days):
{json.dumps(upcoming_sessions, indent=2, default=str)}

INSTRUCTIONS:
- If athlete is struggling (high RPE, fatigue): reduce intensity or duration by 10-15%
- If athlete feels strong and sessions feel too easy: slightly increase key session intensity
- Keep changes subtle — never exceed 10% volume change per week
- Return the adjusted sessions with the same JSON schema

Return only the JSON array. No explanation."""

    raw = _call([{"role": "user", "content": prompt}])
    return json.loads(raw)
