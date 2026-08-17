from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ForecastResponse(BaseModel):
    model_used: str
    days_forecasted: int
    predictions: List[int]
    lower_bounds: Optional[List[int]] = None
    upper_bounds: Optional[List[int]] = None
    recommendation: Dict[str, Any]