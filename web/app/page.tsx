import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export default function ForecastingModule() {
  // 1. Inputs State
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [product, setProduct] = useState("");
  const [days, setDays] = useState(7);
  // ... (keep the rest of your state exactly the same)

  // NEW: Fetch products when the page loads
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${baseUrl}/api/forecasting/products`);
        
        if (response.ok) {
          const data = await response.json();
          setAvailableProducts(data);
          
          // Auto-select the first product in the list so the dropdown isn't blank
          if (data.length > 0) {
            setProduct(data[0]);
          }
        }
      } catch (error) {
        console.error("Gagal memuat daftar produk:", error);
      }
    };

    fetchProducts();
  }, []);

  // ... (keep your handleGenerateForecast function exactly the same)