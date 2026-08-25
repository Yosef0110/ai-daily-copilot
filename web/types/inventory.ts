export type StockStatus = "safe" | "low" | "out";

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  safety_stock: number;
  lead_time_days: number;
  is_active: boolean;
  updated_at: string;
  stock_status: StockStatus;
};

export type InventoryListResponse = {
  success: true;
  data: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
};

export type InventoryApiError = {
  success: false;
  message: string;
};

export type InventoryMovement = {
  id: string;
  movement_type:
    | "sale"
    | "purchase"
    | "damaged"
    | "lost"
    | "expired"
    | "stock_opname"
    | "manual_correction";
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

export type InventoryHistoryResponse = {
  success: true;
  data: {
    product: {
      id: string;
      sku: string;
      name: string;
      current_stock: number;
      minimum_stock: number;
      unit: string;
      is_active: boolean;
    };
    movements: InventoryMovement[];
  };
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
};