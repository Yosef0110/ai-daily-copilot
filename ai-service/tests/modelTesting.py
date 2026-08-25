import pandas as pd
import matplotlib.pyplot as plt
from statsmodels.tsa.stattools import adfuller
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

def run_adf_test(series, title=""):
    """Helper function to run and print ADF test results."""
    print(f"--- ADF Test Results: {title} ---")
    result = adfuller(series.dropna())
    print(f"ADF Statistic: {result[0]:.4f}")
    print(f"p-value: {result[1]:.4f}")
    
    # If p-value < 0.05, we generally consider it stationary
    if result[1] <= 0.05:
        print("Conclusion: Data is likely STATIONARY ✅")
    else:
        print("Conclusion: Data is likely NON-STATIONARY ❌")
    print("-" * 40 + "\n")

def test_sarima_assumptions():
    # 1. Load the dataset
    print("Loading data...")
    df = pd.read_csv('seed_sales_history.csv')
    df['date'] = pd.to_datetime(df['date'])

    # Filter for 'Aqua 600ml' and set daily frequency
    product_name = 'Aqua 600ml'
    ts_data = df[df['product_name'] == product_name].set_index('date')['quantity_sold']
    ts_data = ts_data.asfreq('D')

    # 2. Test Original Series
    run_adf_test(ts_data, "Original Series")

    # 3. Apply First Differencing (d=1) to remove trend
    ts_diff = ts_data.diff().dropna()
    run_adf_test(ts_diff, "First Difference (Trend Removal)")

    # 4. Apply Seasonal Differencing (D=1, s=7) to remove weekly patterns
    ts_seasonal_diff = ts_data.diff(7).dropna()
    run_adf_test(ts_seasonal_diff, "Seasonal Difference Only (Lag 7)")

    # 5. Apply BOTH First and Seasonal Differencing
    ts_both_diff = ts_diff.diff(7).dropna()
    run_adf_test(ts_both_diff, "First + Seasonal Difference")

    # 6. Plot ACF and PACF on the fully differenced (stationary) data
    print("Generating ACF and PACF plots...")
    fig, axes = plt.subplots(1, 2, figsize=(16, 5))
    
    plot_acf(ts_both_diff, ax=axes[0], lags=30, title='ACF (First + Seasonal Difference)')
    plot_pacf(ts_both_diff, ax=axes[1], lags=30, title='PACF (First + Seasonal Difference)')
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    test_sarima_assumptions()