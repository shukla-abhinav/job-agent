# JobSense

A personal AI-powered web application to determine whether you should apply for an international software engineering job.

Paste a job description → get a structured match analysis + an ATS-optimized resume — all generated from your `data/profile.md` profile. Never invents information.

---

## Architecture

```
React UI (Vite + TypeScript + Tailwind)
        │
   REST API (fetch)
        │
   FastAPI (Python 3.12)
        │
   Business Logic + Profile Parser
        │
   LLMProvider interface
        │
   GeminiProvider → Google Gemini API
```

---

## Project Structure

```
job-agent/
├── data/
│   ├── profile.md          # Your profile — source of truth
│   └── preferences.md      # Job preferences
├── generated/              # Generated resume outputs (future use)
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py         # FastAPI app factory
│       ├── config.py       # Pydantic Settings
│       ├── api/
│       │   └── routes.py   # POST /api/match, POST /api/resume
│       ├── models/
│       │   ├── profile.py  # Profile Pydantic models
│       │   └── job.py      # Request/response models
│       ├── services/
│       │   ├── llm_provider.py     # Abstract LLM interface
│       │   ├── gemini_provider.py  # Gemini implementation
│       │   └── profile_parser.py  # profile.md → Profile model
│       ├── prompts/
│       │   ├── match_job.md        # Job match prompt template
│       │   └── generate_resume.md  # Resume generation prompt
│       └── utils/
│           ├── prompt_loader.py    # Load & format prompt .md files
│           └── json_extractor.py  # Extract JSON from LLM responses
└── frontend/
    └── src/
        ├── api/client.ts           # Typed API client
        ├── types/index.ts          # TypeScript types
        ├── hooks/
        │   ├── useJobAnalysis.ts
        │   └── useResumeGenerator.ts
        └── components/
            ├── JobInputPanel.tsx
            ├── AnalysisPanel.tsx
            ├── ResumePanel.tsx
            ├── ScoreMeter.tsx
            └── LoadingSpinner.tsx
```

---

## Setup

### 1. Fill in your profile

Edit `data/profile.md` with your real information. This is the **only source of truth** — the AI never invents anything.

### 2. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash   # or gemini-1.5-pro for higher quality
PROFILE_PATH=../data/profile.md
```

Get a Gemini API key at: https://aistudio.google.com/app/apikey

### 3. Install backend dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Start the backend

```bash
cd backend
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

### 5. Install and start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Usage

1. Open `http://localhost:5173`
2. Paste a job description into the left panel
3. Click **Analyze Match** → see score, strengths, gaps, recommendation
4. Click **Generate Resume** → see a structured, ATS-optimized resume built from your profile

---

## API Reference

### `POST /api/match`

```json
// Request
{ "job_description": "We are looking for a Senior Backend Engineer..." }

// Response
{
  "score": 91,
  "strengths": ["Python", "FastAPI", "AWS"],
  "missing_skills": ["Kafka"],
  "recommendation": "Apply",
  "reasoning": "Excellent backend match with strong cloud experience."
}
```

### `POST /api/resume`

```json
// Request
{ "job_description": "We are looking for a Senior Backend Engineer..." }

// Response
{
  "summary": "...",
  "skills": ["Python", "FastAPI", ...],
  "experience": [{ "title": "...", "company": "...", "period": "...", "bullets": [...] }],
  "projects": [{ "name": "...", "description": "...", "tech": [...] }]
}
```

---

## Swapping the LLM Provider

The `LLMProvider` abstract class (`backend/app/services/llm_provider.py`) defines the interface:

```python
class LLMProvider(ABC):
    async def analyze_job(self, profile, job_description) -> MatchResponse: ...
    async def generate_resume(self, profile, job_description) -> ResumeResponse: ...
```

To add a new provider (e.g., OpenAI):

1. Create `backend/app/services/openai_provider.py` implementing `LLMProvider`
2. Update `backend/app/api/routes.py` to inject the new provider

---

## Customizing Prompts

Prompts live in `backend/app/prompts/` as Markdown files. Edit them freely — no code changes needed. Variables use `{profile}` and `{job_description}` syntax.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Model name |
| `PROFILE_PATH` | `../data/profile.md` | Path to profile file |
