from pydantic import BaseModel, Field
from typing import Optional


class PersonalInfo(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""


class Experience(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    period: str = ""
    bullets: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str = ""
    description: str = ""
    tech: list[str] = Field(default_factory=list)
    github: str = ""


class Education(BaseModel):
    degree: str = ""
    institution: str = ""
    location: str = ""
    period: str = ""
    gpa: Optional[str] = None
    coursework: list[str] = Field(default_factory=list)


class Certification(BaseModel):
    name: str = ""
    year: Optional[str] = None


class SalaryExpectations(BaseModel):
    minimum: str = ""
    target: str = ""
    currency: str = "USD"
    open_to_equity: bool = True
    open_to_contract: bool = False


class Profile(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = ""
    skills: dict[str, list[str]] = Field(default_factory=dict)
    experience: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    preferred_roles: list[str] = Field(default_factory=list)
    preferred_countries: list[str] = Field(default_factory=list)
    salary_expectations: SalaryExpectations = Field(default_factory=SalaryExpectations)
