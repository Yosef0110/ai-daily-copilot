import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_absolute_error, mean_squared_error
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

def evaluate_sarima():
    # 1. Load and prep the data
    print("Loading data...")
    df = pd.read_csv('seed_sales_history.csv')
    df['date'] = pd.to_datetime(df['date'])

    # Filter for Aqua 600ml and set daily frequency
    product_name = 'Aqua 600ml'
    ts_data = df[df['product_name'] == product_name].set_index('date')['quantity_sold']
    ts_data = ts_data.asfreq('D')

    # 2. Train-Test Split (83 days train, 7 days test)
    train = ts_data.iloc[:-7]
    test = ts_data.iloc[-7:]

    print(f"Total dataset: {len(ts_data)} days")
    print(f"Training on: {len(train)} days")
    print(f"Testing on: {len(test)} days")

    # 3. Fit the SARIMA model on the TRAINING data only
    print(f"\nFitting SARIMA model on training data...")
    model = SARIMAX(train, 
                    order=(0, 1, 1), 
                    seasonal_order=(0, 1, 1, 7),
                    enforce_stationarity=False,
                    enforce_invertibility=False)
    results = model.fit(disp=False)

    # 4. Forecast the 7 days of the TEST period
    forecast = results.get_forecast(steps=7)
    predicted_mean = forecast.predicted_mean

    # 5. Calculate Error Metrics
    mae = mean_absolute_error(test, predicted_mean)
    rmse = np.sqrt(mean_squared_error(test, predicted_mean))
    
    # MAPE calculation (safe from division by zero since our data > 0)
    mape = np.mean(np.abs((test - predicted_mean) / test)) * 100

    print(f"\n--- Model Evaluation Metrics ---")
    print(f"MAE (Mean Absolute Error): {mae:.2f} units")
    print(f"RMSE (Root Mean Squared Error): {rmse:.2f} units")
    print(f"MAPE (Mean Absolute Percentage Error): {mape:.2f}%\n")

    # 6. Visualize the results (with connected lines)
    plt.figure(figsize=(12, 6))
    
    # Plot the last 30 days of the training data
    plt.plot(train.index[-30:], train.iloc[-30:], label='Train (Historical)', color='blue', marker='o')
    
    # --- CONNECTING THE LINES ---
    # Grab the last point of the training data
    last_train_date = train.index[-1]
    last_train_value = train.iloc[-1]
    
    # Prepend it to the TEST data for plotting
    test_dates = [last_train_date] + list(test.index)
    test_values = [last_train_value] + list(test.values)
    
    # Prepend it to the FORECAST data for plotting
    pred_dates = [last_train_date] + list(predicted_mean.index)
    pred_values = [last_train_value] + list(predicted_mean.values)
    # -----------------------------
    
    # Plot the connected Test and Forecast lines
    plt.plot(test_dates, test_values, label='Test (Actual Future)', color='green', marker='o')
    plt.plot(pred_dates, pred_values, label='Forecast (Predicted Future)', color='red', marker='x', linestyle='--')

    plt.title(f'SARIMA Model Evaluation - {product_name} (83 Train / 7 Test)')
    plt.xlabel('Date')
    plt.ylabel('Quantity Sold')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    evaluate_sarima()