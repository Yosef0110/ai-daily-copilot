import pandas as pd
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX
import warnings

# Suppress convergence warnings for cleaner console output
warnings.filterwarnings("ignore")

def run_sarima_model():
    # 1. Load the data
    print("Loading sales history...")
    df = pd.read_csv('seed_sales_history.csv')
    df['date'] = pd.to_datetime(df['date'])

    # Filter for 'Aqua 600ml' to test our upward trend + weekend seasonality
    product_name = 'Aqua 600ml'
    ts_data = df[df['product_name'] == product_name].set_index('date')['quantity_sold']
    
    # Ensure the time series has a strict daily frequency
    ts_data = ts_data.asfreq('D')

    # 2. Fit the SARIMA model
    # order = (p, d, q), seasonal_order = (P, D, Q, s)
    print(f"\nFitting SARIMA(0,1,1)(0,1,1,7) model for {product_name}...")
    model = SARIMAX(ts_data, 
                    order=(0, 1, 1), 
                    seasonal_order=(0, 1, 1, 7),
                    enforce_stationarity=False,
                    enforce_invertibility=False)

    results = model.fit(disp=False)

    # 3. Generate the 7-day forecast
    print("\nGenerating 7-day prediction...")
    forecast_steps = 7
    forecast = results.get_forecast(steps=forecast_steps)
    
    # Extract the mean prediction and the 95% confidence intervals
    predicted_mean = forecast.predicted_mean
    conf_int = forecast.conf_int(alpha=0.05)

    # 4. Format the output to match the MVP schema requirements
    forecast_df = pd.DataFrame({
        'forecast_date': predicted_mean.index.strftime('%Y-%m-%d'),
        'predicted_quantity': predicted_mean.round().astype(int),
        'lower_bound': conf_int.iloc[:, 0].round().astype(int),
        'upper_bound': conf_int.iloc[:, 1].round().astype(int)
    })

    print(f"\n--- Output for {product_name} ---")
    print(forecast_df.to_string(index=False))

    # 5. Visualize the forecast for evaluation
    plt.figure(figsize=(12, 6))
    
    # Plot the last 30 days of actual historical data
    plt.plot(ts_data.index[-30:], ts_data.iloc[-30:], label='Historical Sales (Last 30 Days)', color='blue')
    
    # --- NEW CODE TO CONNECT THE LINES ---
    # Get the last historical date and value
    last_hist_date = ts_data.index[-1]
    last_hist_value = ts_data.iloc[-1]
    
    # Create combined lists for plotting the forecast line
    plot_dates = [last_hist_date] + list(predicted_mean.index)
    plot_values = [last_hist_value] + list(predicted_mean)
    
    # Plot the connected forecast line
    plt.plot(plot_dates, plot_values, label='Forecast', color='red', marker='o')
    
    # Connect the confidence bounds similarly (starting from the last historical point)
    lower_bound_plot = [last_hist_value] + list(conf_int.iloc[:, 0])
    upper_bound_plot = [last_hist_value] + list(conf_int.iloc[:, 1])
    
    plt.fill_between(plot_dates, 
                     lower_bound_plot, 
                     upper_bound_plot, 
                     color='red', alpha=0.2, label='95% Confidence Bound')
    # -------------------------------------

    plt.title(f'Sales Forecast Evaluation - {product_name}')
    plt.xlabel('Date')
    plt.ylabel('Quantity Sold')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    run_sarima_model()