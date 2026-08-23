'use client';

import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

export default function ForecastingModule() {
  // State to hold the dynamic list of products from the backend
  type ForecastProduct = {
    id: string;
    name: string;
    current_stock: number;
  };

  const [availableProducts, setAvailableProducts] =
    useState<ForecastProduct[]>([]);

  const [productId, setProductId] = useState("");

  // Inputs State (Notice product starts empty now)
  const [product, setProduct] = useState("");
  
  const [days, setDays] = useState(7);
  const [model, setModel] = useState("auto_arima");
  const [currentStock, setCurrentStock] = useState(35);

  // Data State
  const [chartData, setChartData] = useState([]);
  const [insight, setInsight] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch products automatically when the page loads
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(
          "/api/products?is_active=true&limit=100",
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ?? "Gagal mengambil produk",
          );
        }

        setAvailableProducts(result.data);

        if (result.data.length > 0) {
          const firstProduct = result.data[0];

          setProductId(firstProduct.id);
          setProduct(firstProduct.name);
          setCurrentStock(firstProduct.current_stock);
        }
      } catch (error) {
        console.error(
          "Gagal memuat daftar produk:",
          error,
        );
      }
    }

    void fetchProducts();
  }, []); // The empty array [] means this runs exactly once when the component mounts

  // The Fetch Function for the Chart
  const handleGenerateForecast = async () => {
    if (!product) {
      alert("Tunggu sebentar, sedang memuat data produk!");
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const url = `${baseUrl}/api/forecasting/predict?product_name=${encodeURIComponent(product)}&days=${days}&model_type=${model}&current_stock=${currentStock}`;
            
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch data from backend");
      
      const data = await response.json();

      const formattedData = data.predictions.map((pred: number, index: number) => ({
        day: `Hari ${index + 1}`,
        prediksi: Math.round(pred), 
        rentang: data.lower_bounds && data.upper_bounds 
          ? [Math.round(data.lower_bounds[index]), Math.round(data.upper_bounds[index])] 
          : [Math.round(pred), Math.round(pred)]
      }));

      setChartData(formattedData);
      setInsight(data.recommendation);

    } catch (error) {
      console.error("Error generating forecast:", error);
      alert("Gagal mengambil data dari backend. Pastikan server FastAPI berjalan!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Forecasting & Recommendation</h1>
        <p className="text-slate-500">Prediksi penjualan ke depan dan dapatkan rekomendasi restock cerdas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Pengaturan Forecast</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Produk</label>
                {/* 4. NEW: Dynamic Dropdown mapping the availableProducts array */}
                <select
                  value={productId}
                  onChange={(event) => {
                    const selectedProduct =
                      availableProducts.find(
                        (item) => item.id === event.target.value,
                      );

                    if (!selectedProduct) {
                      return;
                    }

                    setProductId(selectedProduct.id);
                    setProduct(selectedProduct.name);
                    setCurrentStock(selectedProduct.current_stock);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={availableProducts.length === 0}
                >
                  {availableProducts.length > 0 ? (
                    availableProducts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Memuat produk...</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stok Saat Ini</label>
                <input 
                  type="number"
                  value={currentStock}
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durasi Prediksi (1-7 Hari)</label>
                <input 
                  type="number" min="1" max="7" 
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model AI</label>
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto_arima">Auto-SARIMA (Rekomendasi)</option>
                  <option value="holt_winters">Holt-Winters</option>
                  <option value="naive">Naive Baseline</option>
                </select>
              </div>

              <button 
                onClick={handleGenerateForecast}
                disabled={isLoading || availableProducts.length === 0}
                className={`w-full font-medium py-2 px-4 rounded-lg transition-colors mt-2 text-white ${(isLoading || availableProducts.length === 0) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isLoading ? 'Memproses AI...' : 'Generate Forecast'}
              </button>
            </div>
          </div>

          {/* DYNAMIC AI INSIGHT CARD */}
          {insight && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xl shadow-slate-200/50 relative overflow-hidden">
               <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-indigo-50 opacity-50 blur-2xl"></div>
               <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="bg-indigo-500 text-white p-2 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">AI Restock Insight</h3>
                    <p className="text-xs text-slate-500">Berdasarkan prediksi {days} hari</p>
                  </div>
               </div>

               <div className={`flex gap-4 items-start p-3 rounded-lg border mt-4 relative z-10 ${insight.will_stockout ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {product} 
                      <span className={`float-right text-xs px-2 py-0.5 rounded font-bold ${insight.will_stockout ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {insight.will_stockout ? 'STOK MENIPIS' : 'STOK AMAN'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{insight.message}</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Chart Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full min-h-[400px] flex flex-col">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Grafik Prediksi Penjualan</h2>
            
            <div className="flex-1 w-full min-h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="rentang" name="Batas Kepercayaan" fill="#dbeafe" stroke="none" />
                    <Line type="monotone" dataKey="prediksi" name="Prediksi Penjualan" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <p className="text-slate-400 font-medium">Silakan klik "Generate Forecast" untuk memuat grafik.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}