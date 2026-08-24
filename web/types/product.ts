export type Product = {
  id: string;
  business_id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  safety_stock: number;
  lead_time_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductListResponse = {
  success: true;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
};

export type ApiErrorResponse = {
  success: false;
  message: string;
};