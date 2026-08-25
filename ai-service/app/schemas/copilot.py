from typing import Any

from pydantic import BaseModel, Field


class CopilotContext(BaseModel):
    products: list[dict[str, Any]] = Field(default_factory=list)
    transactions: list[dict[str, Any]] = Field(default_factory=list)


class CopilotRequest(BaseModel):
    message: str = Field(min_length=1)
    context: CopilotContext


class CopilotResponse(BaseModel):
    message: str