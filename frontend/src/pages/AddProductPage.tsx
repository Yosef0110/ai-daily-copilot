import { useState } from "react";
import Table from "../components/Table/Table.tsx";
import MOCK_DATA from "../components/Table/MOCK_DATA.json";
import Toast from "../components/Toast/Toast.tsx";
import Button from "../components/Button/Button.tsx";
import AddIcon from "../components/Icons/AddIcon.tsx";

import "./AddProductPage.css";
import StatusCell from "../components/TableUtility/StatusCell.tsx";
import AddProductForm from "../components/AddProductForm/AddProductForm.tsx";
import AddProductPhoto from "../components/AddProductPhoto/AddProductPhoto.tsx";  
import PhotoIcon from "../components/Icons/PhotoIcon.tsx";

interface FormData {
  sku: string;
  name: string;
  category: string;
  unit: string;
  selling_price: number | "";
  current_stock: number | "";
  minimum_stock: number | "";
  safety_stock: number | "";
  lead_time_days: number | "";
}
export type ToastType = "info" | "success" | "warning" | "danger";

const API = "https://zealous-tiger-powdery.ngrok-free.dev";

const COLUMNS = [
  {
    header: "Nama Product",
    accessorKey: "name",
  },
  // {
  //   header: "Kategori Produk",
  //   accessorKey: "category",
  // },
  {
    header: "SKU",
    accessorKey: "SKU",
  },
  // {
  //   header: "Unit",
  //   accessorKey: "unit",
  // },
  {
    header: "Stok Tersisa",
    accessorKey: "current_stock",
    filterFn: "equalsNumber",
  },
  {
    header: "Harga",
    accessorKey: "selling_price",
    filterFn: "equalsNumber",
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: StatusCell,
    filterFn: "equalsNumber",
    enableColumnSearch: false,
  },
  {
    header: "Tanggal Dibuat",
    accessorKey: "created_at",
  },
  {
    header: "Update Terakhir",
    accessorKey: "updated_at",
  },
];

const AddProductPage = () => {
  const [showToast, setToastVisibility] = useState(false);
  const [toastInfo, setToastInfo] = useState<{
    message: string;
    status: ToastType;
  }>({
    message: "",
    status: "info",
  });
  const [activeView, setActiveView] = useState<"form" | "picture" | null>(null);

  const closeForm = () => {
    setActiveView(null);
  };

  const addManual = () => {
    setActiveView("form");
  };

  const addFuzz = () => {
    setActiveView("picture");
  };

  const onsubmit = async (formData: FormData): Promise<boolean> => {
    try {
      const response = await fetch(API+"/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setToastInfo({
          message:
            data.message || `Gagal menambahkan produk: ${response.status}`,
          status: "warning",
        });

        setToastVisibility(true);

        return false;
      }

      console.log("Produk berhasil ditambahkan:", data);

      setToastInfo({
        message: "Produk berhasil ditambahkan.",
        status: "success",
      });

      setToastVisibility(true);

      setActiveView(null);

      return true;
    } catch (error) {
      console.error("Error:", error);

      setToastInfo({
        message: "Tidak dapat terhubung ke server.",
        status: "danger",
      });

      setToastVisibility(true);

      return false;
    }
  };

  return (
    <>
      <Toast
        type={toastInfo.status}
        visible={showToast}
        onClose={() => setToastVisibility(false)}
      >
        {toastInfo.message}
      </Toast>
      <div className="container addButtonWrapper">
        <Button
          backgroundColor="#10B981"
          color="white"
          className="btn-manual"
          icon={<AddIcon width={35} />}
          onClick={addManual}
        >
          Tambahkan Data Manual
        </Button>
        <Button
          backgroundColor="#2563EB"
          color="white"
          className="btn-photo"
          icon={<PhotoIcon width={35} />}
          onClick={addFuzz}
        >
          Tambahkan dengan Gambar
        </Button>
      </div>

      {activeView && (
        <div className="formAddWrapper">
          {activeView === "form" && (
            <AddProductForm onClose={closeForm} onSubmit={onsubmit} />
          )}

          {activeView === "picture" && <AddProductPhoto onClose={closeForm} />}
        </div>
      )}

      <Table HeaderProps={COLUMNS} data={MOCK_DATA}></Table>
    </>
  );
};

export default AddProductPage;
