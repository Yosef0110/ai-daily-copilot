'use client';
import React, { useState } from 'react';

export default function ForecastingModule() {
  const [days, setDays] = useState(7);
  const [model, setModel] = useState("auto_arima");

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Forecasting & Recommendation</h1>
        <p className="text-slate-500">Prediksi penjualan ke depan dan dapatkan rekomendasi restock cerdas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & AI Insight */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Settings Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Pengaturan Forecast</h2>
            
            <div className="space-y-4">
              {/* Product Select (Matches Input style from Image 2) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Produk</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Aqua 600ml</option>
                  <option>Indomie Goreng 85g</option>
                </select>
              </div>

              {/* Days Input (1-7 Validation UI) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durasi Prediksi (1-7 Hari)</label>
                <input 
                  type="number" 
                  min="1" max="7" 
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Model Select */}
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

              {/* Primary Button (Matches Image 2) */}
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mt-2">
                Generate Forecast
              </button>
            </div>
          </div>

          {/* AI Insight Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xl shadow-slate-200/50 relative overflow-hidden">
             {/* Decorative Background Glow */}
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-indigo-50 opacity-50 blur-2xl"></div>
             
             <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="bg-indigo-500 text-white p-2 rounded-lg">
                  {/* Sparkles Icon SVG */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">AI Restock Insight</h3>
                  <p className="text-xs text-slate-500">Berdasarkan prediksi {days} hari ke depan</p>
                </div>
             </div>

             {/* Alert Content */}
             <div className="flex gap-4 items-start p-3 bg-orange-50 rounded-lg border border-orange-100 mt-4 relative z-10">
                <div className="text-orange-500 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Aqua 600ml <span className="float-right text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">STOK MENIPIS</span></p>
                  <p className="text-xs text-slate-600 mt-1">Stok saat ini (35 botol) diprediksi habis dalam <strong>4 hari</strong>. Segera lakukan restock.</p>
                </div>
             </div>
          </div>

        </div>

        {/* Right Column: Chart Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full min-h-[400px] flex flex-col">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Grafik Prediksi Penjualan</h2>
            
            {/* Chart Container Placeholder */}
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
              <p className="text-slate-400 font-medium">Area Chart Recharts akan diletakkan di sini</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}