def generate_action_recommendation(predictions: list[int], current_stock: int, product_name: str) -> dict:
    """
    GOAL #3: Action Recommendation.
    Simulates inventory depletion based on the forecast and warns if a stock-out is imminent.
    """
    simulated_stock = current_stock
    stockout_day = None
    
    # Loop through the forecasted days
    for day_index, daily_demand in enumerate(predictions):
        simulated_stock -= daily_demand
        
        # If stock hits 0 or goes negative, we found our stock-out day
        if simulated_stock <= 0:
            stockout_day = day_index + 1  # +1 because index starts at 0 (Day 1, Day 2, etc.)
            break
            
    # Generate the appropriate action message
    if stockout_day is not None:
        return {
            "will_stockout": True,
            "stockout_day": stockout_day,
            "remaining_stock": 0,
            "message": f"⚠️ ALERT: '{product_name}' is predicted to run out of stock in {stockout_day} day(s). Action: Restock immediately."
        }
    else:
        return {
            "will_stockout": False,
            "stockout_day": None,
            "remaining_stock": simulated_stock,
            "message": f"✅ Inventory for '{product_name}' is healthy. No immediate restock needed for the next {len(predictions)} days."
        }