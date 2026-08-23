You are a professional resume parser. Extract structured profile information from the raw resume text below.

Return ONLY a valid JSON object matching this exact schema — no markdown, no code fences, no commentary:

```
{
  "personal_info": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "github": "string",
    "portfolio": "string"
  },
  "summary": "string (2-4 sentence professional summary, inferred if not present)",
  "skills": {
    "Category Name": ["skill1", "skill2", ...],
    ...
  },
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "period": "string (e.g. Jan 2022 – Mar 2024)",
      "bullets": ["achievement 1", "achievement 2", ...]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "tech": ["tech1", "tech2"],
      "github": "string"
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string",
      "period": "string",
      "gpa": "string or null",
      "coursework": ["course1", "course2"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "year": "string or null"
    }
  ],
  "preferred_roles": [],
  "preferred_countries": [],
  "salary_expectations": {
    "minimum": "",
    "target": "",
    "currency": "USD",
    "open_to_equity": true,
    "open_to_contract": false
  }
}
```

Rules:
- Group skills by logical category (e.g. "Languages", "Frameworks", "Cloud & Infrastructure", "Databases", "Tools").
- If a field is not present in the resume, use an empty string "" or an empty list [].
- Do NOT invent information that is not in the resume. Only infer the summary if one is not explicitly provided.
- preferred_roles, preferred_countries, and salary_expectations should always be empty defaults — the user will supply those separately.
- Return ONLY the JSON object. Do not wrap it in markdown or add any explanation.

---

Resume text:
{resume_text}
