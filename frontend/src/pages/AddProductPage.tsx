import { useState } from "react";
import Table from "../components/Table/Table.tsx";
import MOCK_DATA from "../components/Table/MOCK_DATA.json";
import Toast from "../components/Toast/Toast.tsx";
import Button from "../components/Button/Button.tsx";
import AddIcon from "../components/Icons/AddIcon.tsx";
import CameraIcon from "../components/Icons/CameraIcon.tsx";
import "./AddProductPage.css";
import StatusCell from "../components/TableUtility/StatusCell.tsx";

const AddProductPage = () => {
  const [showToast, setToastVisibility] = useState(true);

  const COLUMNS = [
    {
      header: "Nama Product", 
      accessorKey: "name",
    },
    {
      header: "Kategori Produk",
      accessorKey: "category",
    },
    {
      header: "SKU",
      accessorKey: "SKU",
    },
    {
      header: "Unit",
      accessorKey: "unit",
    },
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
      filterFn: "equalsBoolean",
      enableColumnSearch: false
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

  return (
    <>
      <Toast
        type="warning"
        visible={showToast}
        onClose={() => setToastVisibility(false)}
      >
        Ada masalah saat mengupdate data
      </Toast>

      <div className="container addWrapper">
        <Button
          backgroundColor="#10B981"
          color="white"
          className="btn-manual"
          icon={<AddIcon width={35} />}
        >
          Tambahkan Data Manual
        </Button>
        <Button
          backgroundColor="#2563EB"
          color="white"
          className="btn-photo"
          icon={<CameraIcon width={35} />}
        >
          Tambahkan dengan Foto
        </Button>
      </div>
      <Table HeaderProps={COLUMNS} data={MOCK_DATA}></Table>
      
    </>
  );
};

export default AddProductPage;
