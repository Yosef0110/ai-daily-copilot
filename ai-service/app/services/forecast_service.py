import pandas as pd
import pmdarima as pm
from statsmodels.tsa.holtwinters import ExponentialSmoothing

# FORECASTING ALGORITHMS

#Naive Model
def forecast_naive(series: pd.Series, days: int):
    """The Baseline: Predicts tomorrow will be exactly like today."""
    last_val = series.iloc[-1]
    predictions = [max(0, int(round(last_val)))] * days
    return predictions, None, None

#ARIMA Model
def forecast_auto_arima(series: pd.Series, days: int):
    """
    GOAL #4: Automatic Parameter Adjustment.
    pmdarima automatically runs ADF tests, handles differencing (d), 
    and finds the best p, q, P, Q parameters based on the data.
    """
    model = pm.auto_arima(
        series, 
        seasonal=True, 
        m=7, # Set to 7 for weekly seasonality
        stepwise=True, 
        suppress_warnings=True, 
        error_action="ignore"
    )
    
    # Generate predictions and 95% confidence intervals
    forecast, conf_int = model.predict(n_periods=days, return_conf_int=True)
    
    # Clean up the outputs (no negative sales, round to whole numbers)
    predictions = [max(0, int(round(val))) for val in forecast]
    lower_bounds = [max(0, int(round(ci[0]))) for ci in conf_int]
    upper_bounds = [max(0, int(round(ci[1]))) for ci in conf_int]
    
    return predictions, lower_bounds, upper_bounds

#Exponential Smoothing Model
def forecast_holt_winters(series: pd.Series, days: int):
    """Exponential Smoothing: Great for retail, heavily weighs recent trends."""
    model = ExponentialSmoothing(
        series, 
        trend='add', 
        seasonal='add', 
        seasonal_periods=7
    ).fit()
    
    forecast = model.forecast(days)
    predictions = [max(0, int(round(val))) for val in forecast]
    
    return predictions, None, None

# MAIN ROUTING FUNCTION

def generate_forecast(ts_data: pd.Series, days_forward: int = 7, model_type: str = "auto_arima"):
    """
    Model Selection & Forecast Selection.
    Takes the requested days (1-7) and routes to the selected model.
    """
    # Ensure time series has a strict daily frequency
    ts_data = ts_data.asfreq('D').ffill()

    if model_type == "naive":
        preds, lower, upper = forecast_naive(ts_data, days_forward)
        model_name = "Naive Baseline"
        
    elif model_type == "auto_arima":
        preds, lower, upper = forecast_auto_arima(ts_data, days_forward)
        model_name = "Auto-SARIMA"
        
    elif model_type == "holt_winters":
        preds, lower, upper = forecast_holt_winters(ts_data, days_forward)
        model_name = "Holt-Winters Exponential Smoothing"
        
    else:
        raise ValueError(f"Model '{model_type}' is not supported.")
        
    # Return a clean dictionary to be passed to the API route
    return {
        "model_used": model_name,
        "days_forecasted": days_forward,
        "predictions": preds,
        "lower_bounds": lower,
        "upper_bounds": upper
    }