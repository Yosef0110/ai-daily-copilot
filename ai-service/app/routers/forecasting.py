from fastapi import APIRouter, Query, HTTPException
import pandas as pd
import os
from app.services.forecast_service import generate_forecast
from app.schemas.forecasting import ForecastResponse

router = APIRouter(
    prefix="/api/forecasting",
    tags=["Forecasting"]
)

@router.get("/predict", response_model=ForecastResponse)
def get_prediction(
    product_name: str = Query(..., description="The name of the product (e.g., 'Aqua 600ml')"),
    #1-7 DAYS RULE: ge=1 (greater/equal 1), le=7 (less/equal 7)
    days: int = Query(7, ge=1, le=7, description="Number of days to predict (Must be between 1 and 7)"),
    model_type: str = Query("auto_arima", description="Choose: naive, auto_arima, holt_winters"),
    current_stock: int = Query(..., ge=0, description="Current inventory level of the product")
):
    """
    Generate a sales forecast for a specific product.
    """

    ##IMPORTANT!!!!!!!##
    #Load the seed data (For testing purposes, this would be modified when the database format is clear and where to fetch it)
    file_path = os.path.join(os.path.dirname(__file__), "../../test/seed_sales_history.csv")
    
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Could not locate seed_sales_history.csv")

    #Filter data for the requested product
    product_data = df[df['product_name'] == product_name]
    
    if product_data.empty:
        raise HTTPException(status_code=404, detail=f"Product '{product_name}' not found in history.")

    #Format the data into a Time Series pandas Series
    product_data['date'] = pd.to_datetime(product_data['date'])
    ts_data = product_data.set_index('date')['quantity_sold']

    #Call the service
    try:
        result = generate_forecast(ts_data, days_forward=days, model_type=model_type)
        return result
    except ValueError as e:
        #Catches unsupported model types
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {str(e)}")

    try:
        #Get the forecast predictions
        result = generate_forecast(ts_data, days_forward=days, model_type=model_type)
        
        #Recommendation Logic 
        action_plan = generate_action_recommendation(
            predictions=result["predictions"], 
            current_stock=current_stock, 
            product_name=product_name
        )
        
        #Attach the recommendation to the final result
        result["recommendation"] = action_plan
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {str(e)}")