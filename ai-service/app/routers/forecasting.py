from fastapi import APIRouter, Query, HTTPException
import pandas as pd
from pathlib import Path

from app.services.forecast_service import generate_forecast
from app.services.forecast_recommendation_service import generate_action_recommendation 
from app.schemas.forecasting import ForecastResponse, ForecastRequest

router = APIRouter(
    prefix="/api/forecasting",
    tags=["Forecasting"]
)

@router.get("/products")
def get_available_products():
    """
    Fetch a list of all unique products available in the database/CSV.
    """
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    file_path = BASE_DIR / "data" / "seed_sales_history.csv"
    
    try:
        df = pd.read_csv(file_path)
        # Grab the column, get unique values, and convert to a standard Python list
        products = df['product_name'].dropna().unique().tolist()
        return products
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Could not locate sales data.")

@router.post("/predict", response_model=ForecastResponse)
def get_prediction(payload: ForecastRequest):
    """
    Generate a sales forecast using historical sales data
    supplied by the Next.js/Supabase layer.
    """

    if not payload.history:
        raise HTTPException(
            status_code=400,
            detail="Historical sales data is empty.",
        )

    df = pd.DataFrame(
        [
            {
                "date": item.date,
                "quantity_sold": item.quantity_sold,
            }
            for item in payload.history
        ]
    )

    df["date"] = pd.to_datetime(df["date"])

    df = (
        df.groupby("date", as_index=False)["quantity_sold"]
        .sum()
        .sort_values("date")
    )

    ts_data = df.set_index("date")["quantity_sold"]

    try:
        result = generate_forecast(
            ts_data,
            days_forward=payload.days,
            model_type=payload.model_type,
        )

        action_plan = generate_action_recommendation(
            predictions=result["predictions"],
            current_stock=payload.current_stock,
            product_name=payload.product_name,
        )

        result["recommendation"] = action_plan

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Forecast generation failed: {str(e)}",
        )