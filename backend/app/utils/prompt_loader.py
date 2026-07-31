"""
Utility for loading and formatting prompt templates from .md files.
"""

import re
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def load_prompt(name: str, **kwargs: str) -> str:
    """
    Load a prompt template from the prompts/ directory and fill in variables.

    Args:
        name: Filename without extension (e.g., "match_job").
        **kwargs: Variables to substitute using {variable_name} syntax.

    Returns:
        Formatted prompt string.

    Raises:
        FileNotFoundError: If the prompt file does not exist.
        KeyError: If a required variable is missing.
    """
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")

    template = path.read_text(encoding="utf-8")

    # Replace {variable} placeholders
    for key, value in kwargs.items():
        template = template.replace(f"{{{key}}}", value)

    # Check for unreplaced placeholders
    remaining = re.findall(r"\{(\w+)\}", template)
    if remaining:
        raise ValueError(f"Prompt '{name}' has unresolved variables: {remaining}")

    return template
