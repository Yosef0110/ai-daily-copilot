from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SalesHistoryItem(BaseModel):
    date: str
    quantity_sold: float


class ForecastRequest(BaseModel):
    product_name: str
    days: int = Field(default=7, ge=1, le=7)
    model_type: str = "auto_arima"
    current_stock: float = Field(ge=0)
    history: list[SalesHistoryItem]


class ForecastResponse(BaseModel):
    model_used: str
    days_forecasted: int
    predictions: List[int]
    lower_bounds: Optional[List[int]] = None
    upper_bounds: Optional[List[int]] = None
    recommendation: Dict[str, Any]