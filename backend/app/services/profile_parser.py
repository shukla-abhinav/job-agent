"""
Profile parser: converts profile.md into a structured Profile Pydantic model.
Uses regex + section heading detection. No LLM involved.
"""

import re
from pathlib import Path
from app.models.profile import (
    Profile,
    PersonalInfo,
    Experience,
    Project,
    Education,
    Certification,
    SalaryExpectations,
)


def _split_sections(text: str) -> dict[str, str]:
    """Split markdown by level-2 headings (##)."""
    pattern = re.compile(r"^##\s+(.+)$", re.MULTILINE)
    headings = list(pattern.finditer(text))
    sections: dict[str, str] = {}
    for i, match in enumerate(headings):
        title = match.group(1).strip()
        start = match.end()
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        sections[title.lower()] = text[start:end].strip()
    return sections


def _parse_personal_info(text: str) -> PersonalInfo:
    fields: dict[str, str] = {}
    for line in text.splitlines():
        m = re.match(r"-\s+\*\*(.+?):\*\*\s*(.+)", line)
        if m:
            key = m.group(1).strip().lower().replace(" ", "_")
            value = m.group(2).strip()
            fields[key] = value
    return PersonalInfo(
        name=fields.get("name", ""),
        email=fields.get("email", ""),
        phone=fields.get("phone", ""),
        location=fields.get("location", ""),
        linkedin=fields.get("linkedin", ""),
        github=fields.get("github", ""),
        portfolio=fields.get("portfolio", ""),
    )


def _parse_skills(text: str) -> dict[str, list[str]]:
    """Parse level-3 skill categories and their bullet lists."""
    skills: dict[str, list[str]] = {}
    current_category = "General"
    for line in text.splitlines():
        h3 = re.match(r"^###\s+(.+)$", line)
        if h3:
            current_category = h3.group(1).strip()
            skills[current_category] = []
        elif re.match(r"^-\s+", line):
            item = line.lstrip("- ").strip()
            if item:
                skills.setdefault(current_category, []).append(item)
    return skills


def _parse_experience(text: str) -> list[Experience]:
    """Parse multiple experience entries separated by ### headings."""
    entries: list[Experience] = []
    # Split by h3 headings
    blocks = re.split(r"^###\s+", text, flags=re.MULTILINE)
    for block in blocks:
        if not block.strip():
            continue
        lines = block.strip().splitlines()
        title = lines[0].strip() if lines else ""
        company = location = period = ""
        bullets: list[str] = []

        for line in lines[1:]:
            # Company line: **Company** · Location · *Period*
            company_match = re.match(r"\*\*(.+?)\*\*\s*[·•]\s*(.+?)\s*[·•]\s*\*(.+?)\*", line)
            if company_match:
                company = company_match.group(1).strip()
                location = company_match.group(2).strip()
                period = company_match.group(3).strip()
                continue
            bullet_match = re.match(r"^-\s+(.+)", line)
            if bullet_match:
                bullets.append(bullet_match.group(1).strip())

        if title:
            entries.append(
                Experience(
                    title=title,
                    company=company,
                    location=location,
                    period=period,
                    bullets=bullets,
                )
            )
    return entries


def _parse_projects(text: str) -> list[Project]:
    entries: list[Project] = []
    blocks = re.split(r"^###\s+", text, flags=re.MULTILINE)
    for block in blocks:
        if not block.strip():
            continue
        lines = block.strip().splitlines()
        name = lines[0].strip() if lines else ""
        description = ""
        tech: list[str] = []
        github = ""

        for line in lines[1:]:
            if not line.strip() or line.startswith("#"):
                continue
            tech_match = re.match(r"-\s+\*\*Tech:\*\*\s*(.+)", line)
            if tech_match:
                tech = [t.strip() for t in tech_match.group(1).split(",")]
                continue
            github_match = re.match(r"-\s+\*\*GitHub:\*\*\s*(.+)", line)
            if github_match:
                github = github_match.group(1).strip()
                continue
            if line.startswith("-"):
                # Generic bullet — use as description if none yet
                if not description:
                    description = line.lstrip("- ").strip()
            elif line.strip() and not description:
                description = line.strip()

        if name:
            entries.append(Project(name=name, description=description, tech=tech, github=github))
    return entries


def _parse_education(text: str) -> list[Education]:
    entries: list[Education] = []
    blocks = re.split(r"^###\s+", text, flags=re.MULTILINE)
    for block in blocks:
        if not block.strip():
            continue
        lines = block.strip().splitlines()
        degree = lines[0].strip() if lines else ""
        institution = location = period = ""
        gpa = None
        coursework: list[str] = []

        for line in lines[1:]:
            inst_match = re.match(r"\*\*(.+?)\*\*\s*[·•]\s*(.+?)\s*[·•]\s*\*(.+?)\*", line)
            if inst_match:
                institution = inst_match.group(1).strip()
                location = inst_match.group(2).strip()
                period = inst_match.group(3).strip()
                continue
            gpa_match = re.match(r"-\s+GPA:\s*(.+)", line)
            if gpa_match:
                gpa = gpa_match.group(1).strip()
                continue
            course_match = re.match(r"-\s+Coursework:\s*(.+)", line)
            if course_match:
                coursework = [c.strip() for c in course_match.group(1).split(",")]
                continue

        if degree:
            entries.append(
                Education(
                    degree=degree,
                    institution=institution,
                    location=location,
                    period=period,
                    gpa=gpa,
                    coursework=coursework,
                )
            )
    return entries


def _parse_certifications(text: str) -> list[Certification]:
    entries: list[Certification] = []
    for line in text.splitlines():
        m = re.match(r"-\s+(.+?)\s*(?:\((\d{4})\))?$", line.strip())
        if m:
            name = m.group(1).strip()
            year = m.group(2)
            entries.append(Certification(name=name, year=year))
    return entries


def _parse_list_items(text: str) -> list[str]:
    items = []
    for line in text.splitlines():
        m = re.match(r"-\s+(.+)", line.strip())
        if m:
            items.append(m.group(1).strip())
    return items


def _parse_salary(text: str) -> SalaryExpectations:
    fields: dict[str, str] = {}
    for line in text.splitlines():
        m = re.match(r"-\s+\*\*(.+?):\*\*\s*(.+)", line)
        if m:
            key = m.group(1).strip().lower().replace(" ", "_")
            value = m.group(2).strip()
            fields[key] = value
    return SalaryExpectations(
        minimum=fields.get("minimum", ""),
        target=fields.get("target", ""),
        currency=fields.get("currency_preference", "USD"),
        open_to_equity=fields.get("open_to_equity", "yes").lower() == "yes",
        open_to_contract=fields.get("open_to_contract", "no").lower() == "yes",
    )


def parse_profile(path: Path) -> Profile:
    """Parse a profile.md file into a Profile model."""
    if not path.exists():
        raise FileNotFoundError(f"Profile file not found: {path}")

    text = path.read_text(encoding="utf-8")
    sections = _split_sections(text)

    return Profile(
        personal_info=_parse_personal_info(sections.get("personal information", "")),
        summary=sections.get("summary", ""),
        skills=_parse_skills(sections.get("skills", "")),
        experience=_parse_experience(sections.get("experience", "")),
        projects=_parse_projects(sections.get("projects", "")),
        education=_parse_education(sections.get("education", "")),
        certifications=_parse_certifications(sections.get("certifications", "")),
        preferred_roles=_parse_list_items(sections.get("preferred roles", "")),
        preferred_countries=_parse_list_items(sections.get("preferred countries", "")),
        salary_expectations=_parse_salary(sections.get("salary expectations", "")),
    )
