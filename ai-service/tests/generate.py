import pandas as pd
import numpy as np
import uuid
from datetime import datetime, timedelta

def generate_dummy_data():
    # 1. Define Product Master (Seed Data)
    products = [
        {
            "product_id": str(uuid.uuid4()),
            "product_name": "Indomie Goreng",
            "current_stock": 15,     # Low stock, high sales
            "minimum_stock": 50,
            "trend": "steady_high"
        },
        {
            "product_id": str(uuid.uuid4()),
            "product_name": "Aqua 600ml",
            "current_stock": 150,
            "minimum_stock": 50,
            "trend": "upward"        # For the "Aqua naik 15%" insight
        },
        {
            "product_id": str(uuid.uuid4()),
            "product_name": "Kopi ABC",
            "current_stock": 100,
            "minimum_stock": 30,
            "trend": "downward"      # For the "Kopi ABC menurun" insight
        }
    ]
    
    df_products = pd.DataFrame(products)
    
    # 2. Generate 90 Days of Time Series Data (May 9, 2026 - Aug 6, 2026)
    end_date = datetime.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=89)
    dates = pd.date_range(start=start_date, end=end_date)
    
    sales_records = []
    np.random.seed(42) # For reproducibility
    
    for _, product in df_products.iterrows():
        base_sales = 25 if product['trend'] == 'steady_high' else 15
        
        for i, date in enumerate(dates):
            # Base daily sales with slight random noise
            daily_sales = max(0, int(np.random.normal(base_sales, 4)))
            
            # Inject Weekend Seasonality (higher sales on Sat/Sun)
            is_weekend = 1 if date.weekday() >= 5 else 0
            if is_weekend:
                daily_sales += int(np.random.normal(8, 2))
                
            # Inject Trends for the last 14 days to trigger MVP Insights
            if i >= len(dates) - 14:
                if product['trend'] == 'upward':
                    daily_sales += int((i - (len(dates) - 14)) * 1.5) 
                elif product['trend'] == 'downward':
                    daily_sales -= int((i - (len(dates) - 14)) * 1.2)
                    daily_sales = max(0, daily_sales)
            
            sales_records.append({
                "date": date.strftime('%Y-%m-%d'),
                "product_id": product['product_id'],
                "product_name": product['product_name'], # <-- Added Product Name here
                "quantity_sold": daily_sales,
                "is_weekend": is_weekend
            })

    df_sales = pd.DataFrame(sales_records)
    
    # Clean up product DataFrame for output
    df_products_clean = df_products.drop(columns=['trend'])
    
    # Export to CSV
    df_products_clean.to_csv('seed_products.csv', index=False)
    df_sales.to_csv('seed_sales_history.csv', index=False)
    
    print("✅ Successfully generated seed_products.csv and seed_sales_history.csv")
    print(f"📅 Data range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")

if __name__ == "__main__":
    generate_dummy_data()
