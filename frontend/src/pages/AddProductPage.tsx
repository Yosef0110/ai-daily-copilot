import { useState } from "react";
import Table from "../components/Table/Table.tsx";
import MOCK_DATA from "../components/Table/MOCK_DATA.json";
import Toast from "../components/Toast/Toast.tsx";
import Button from "../components/Button/Button.tsx";
import AddIcon from "../components/Icons/AddIcon.tsx";
import CameraIcon from "../components/Icons/CameraIcon.tsx";
import "./AddProductPage.css";
import StatusCell from "../components/TableUtility/StatusCell.tsx";

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
  const [showToast, setToastVisibility] = useState(true);
  const [showForm, setFormVisibility] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    sku: "",
    name: "",
    category: "",
    unit: "",
    selling_price: "",
    current_stock: "",
    minimum_stock: "",
    safety_stock: "",
    lead_time_days: "",
  });

  const [errors, setErrors] = useState({
    sku: "",
    name: "",
    category: "",
    unit: "",
    selling_price:"",
    current_stock: "",
    minimum_stock: "",
    safety_stock:  "",
    lead_time_days: "",
  });

  const validateForm = () => {
    const newErrors = {
      sku: "",
      name: "",
      category: "",
      unit: "",
      selling_price: "",
      current_stock: "",
      minimum_stock: "",
      safety_stock: "",
      lead_time_days: "",
    };

    if (!formData.sku.trim()) {
      newErrors.sku = "SKU wajib diisi";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Nama produk wajib diisi";
    }

    if (!formData.category.trim()) {
      newErrors.category = "Kategori wajib diisi";
    }

    if (!formData.unit.trim()) {
      newErrors.unit = "Unit wajib diisi";
    }

    if (formData.selling_price === "") {
      newErrors.selling_price = "Harga jual wajib diisi";
    } else if (formData.selling_price <= 0) {
      newErrors.selling_price = "Harga jual harus lebih dari 0";
    }

    if (formData.current_stock === "") {
      newErrors.current_stock = "Stok awal wajib diisi";
    } else if (formData.current_stock < 0) {
      newErrors.current_stock = "Stok tidak boleh negatif";
    }

    if (formData.minimum_stock === "") {
      newErrors.minimum_stock = "Stok minimum wajib diisi";
    } else if (formData.minimum_stock < 0) {
      newErrors.minimum_stock = "Stok minimum tidak boleh negatif";
    }

    if (formData.safety_stock === "") {
      newErrors.safety_stock = "Safety stock wajib diisi";
    } else if (formData.safety_stock < 0) {
      newErrors.safety_stock = "Safety stock tidak boleh negatif";
    }

    if (formData.lead_time_days === "") {
      newErrors.lead_time_days = "Lead time wajib diisi";
    } else if (formData.lead_time_days < 0) {
      newErrors.lead_time_days = "Lead time tidak boleh negatif";
    }

    setErrors(newErrors);

    return Object.values(newErrors).every((error) => error === "");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;

    let newValue;

    if (type === "number") {
      if (value === "") {
        newValue = "";
      } else {
        newValue = Number(value);
      }
    } else {
      newValue = value;
    }

    setFormData((prev) => ({
      ...prev,
      [id]: newValue,
    }));
  };

  // const API = "https://zealous-tiger-powdery.ngrok-free.dev";
  // const addProductAPI ="https://zealous-tiger-powdery.ngrok-free.dev/api/products";

  const closeForm = () => {
    setFormVisibility(false);
  };

  const addManual = () => {
    setFormVisibility(true);
  };

  const addFuzz = () => {};

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    console.log(formData);
  };

  return (
    <>
      <Toast
        type="warning"
        visible={showToast}
        onClose={() => setToastVisibility(false)}
      >
        Ada masalah saat mengupdate data
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
          icon={<CameraIcon width={35} />}
          onClick={addFuzz}
        >
          Tambahkan dengan Foto
        </Button>
      </div>

      {/* {showForm && (
        <div className="formAddWrapper">
          <div className="row formWrapper">
            <h2>Tambah Produk</h2>
            <span>Tambahkan produk ke dalam database</span>
            <div className="formCloseButton" onClick={closeForm}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
                width="20px"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </div>
            <form className="formQuery row gy-3" onSubmit={handleSubmit}>
              <div className="col-md-6">
                <label className="form-label">SKU</label>
                <input
                  type="text"
                  className={`form-control ${errors.sku? 'is-invalid' : ''}`}
                  id="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.sku}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Nama Produk</label>
                <input
                  type="text"
                  className={`form-control ${errors.name? 'is-invalid' : ''}`}
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.name}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Kategori</label>
                <input
                  type="text"
                  className={`form-control ${errors.category? 'is-invalid' : ''}`}
                  id="category"
                  value={formData.category}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.category}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  className={`form-control ${errors.unit? 'is-invalid' : ''}`}
                  id="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.unit}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Harga Jual</label>
                <input
                  type="number"
                  className={`form-control ${errors.selling_price? 'is-invalid' : ''}`}
                  id="selling_price"
                  value={formData.selling_price}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.selling_price}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Stok awal</label>
                <input
                  type="number"
                  className={`form-control ${errors.current_stock? 'is-invalid' : ''}`}
                  id="current_stock"
                  value={formData.current_stock}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.current_stock}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Stok Minimum</label>
                <input
                  type="number"
                  className={`form-control ${errors.minimum_stock? 'is-invalid' : ''}`}
                  id="minimum_stock"
                  value={formData.minimum_stock}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                    {errors.minimum_stock}
                  </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Safety Stok</label>
                <input
                  type="number"
                  className={`form-control ${errors.safety_stock? 'is-invalid' : ''}`}
                  id="safety_stock"
                  value={formData.safety_stock}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.safety_stock}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Lead Time (hari)</label>
                <input
                  type="number"
                  className={`form-control ${errors.lead_time_days? 'is-invalid' : ''}`}
                  id="lead_time_days"
                  value={formData.lead_time_days}
                  onChange={handleInputChange}
                />
                <div id="validationServerUsernameFeedback" className="invalid-feedback">
                  {errors.lead_time_days}
                </div>
              </div>

              <div className="col-12 addFormSubmitButton d-flex justify-content-end">
                <button type="submit" className="btn btn-primary">
                  Tambahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )} */}
      {showForm && (
        <div className="formAddWrapper">
          <div className="formWrapper">
            {/* Header */}
            <div className="formHeader">
              <div>
                <h2>Tambah Produk</h2>
                <span>Tambahkan produk ke dalam database</span>
              </div>

              <div className="formCloseButton" onClick={closeForm}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  width="20px"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>

            {/* Form */}
            <form className="formQuery" onSubmit={handleSubmit}>
              <div className="formBody">
                <div className="row gy-3">
                  <div className="col-md-6">
                    <label htmlFor="sku" className="form-label">
                      SKU
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        errors.sku ? "is-invalid" : ""
                      }`}
                      id="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      aria-describedby="skuFeedback"
                    />
                    <div id="skuFeedback" className="invalid-feedback">
                      {errors.sku}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="name" className="form-label">
                      Nama Produk
                    </label>

                    <input
                      type="text"
                      className={`form-control ${
                        errors.name ? "is-invalid" : ""
                      }`}
                      id="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      aria-describedby="nameFeedback"
                    />

                    <div id="nameFeedback" className="invalid-feedback">
                      {errors.name}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label">
                      Kategori
                    </label>

                    <input
                      type="text"
                      className={`form-control ${
                        errors.category ? "is-invalid" : ""
                      }`}
                      id="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      aria-describedby="categoryFeedback"
                    />

                    <div id="categoryFeedback" className="invalid-feedback">
                      {errors.category}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="unit" className="form-label">
                      Unit
                    </label>

                    <input
                      type="text"
                      className={`form-control ${
                        errors.unit ? "is-invalid" : ""
                      }`}
                      id="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      aria-describedby="unitFeedback"
                    />

                    <div id="unitFeedback" className="invalid-feedback">
                      {errors.unit}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="selling_price" className="form-label">
                      Harga Jual
                    </label>

                    <input
                      type="number"
                      className={`form-control ${
                        errors.selling_price ? "is-invalid" : ""
                      }`}
                      id="selling_price"
                      value={formData.selling_price}
                      onChange={handleInputChange}
                      aria-describedby="sellingPriceFeedback"
                    />

                    <div id="sellingPriceFeedback" className="invalid-feedback">
                      {errors.selling_price}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="current_stock" className="form-label">
                      Stok Awal
                    </label>

                    <input
                      type="number"
                      className={`form-control ${
                        errors.current_stock ? "is-invalid" : ""
                      }`}
                      id="current_stock"
                      value={formData.current_stock}
                      onChange={handleInputChange}
                      aria-describedby="currentStockFeedback"
                    />

                    <div id="currentStockFeedback" className="invalid-feedback">
                      {errors.current_stock}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="minimum_stock" className="form-label">
                      Stok Minimum
                    </label>

                    <input
                      type="number"
                      className={`form-control ${
                        errors.minimum_stock ? "is-invalid" : ""
                      }`}
                      id="minimum_stock"
                      value={formData.minimum_stock}
                      onChange={handleInputChange}
                      aria-describedby="minimumStockFeedback"
                    />

                    <div id="minimumStockFeedback" className="invalid-feedback">
                      {errors.minimum_stock}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="safety_stock" className="form-label">
                      Safety Stock
                    </label>

                    <input
                      type="number"
                      className={`form-control ${
                        errors.safety_stock ? "is-invalid" : ""
                      }`}
                      id="safety_stock"
                      value={formData.safety_stock}
                      onChange={handleInputChange}
                      aria-describedby="safetyStockFeedback"
                    />

                    <div id="safetyStockFeedback" className="invalid-feedback">
                      {errors.safety_stock}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="lead_time_days" className="form-label">
                      Lead Time (hari)
                    </label>

                    <input
                      type="number"
                      className={`form-control ${
                        errors.lead_time_days ? "is-invalid" : ""
                      }`}
                      id="lead_time_days"
                      value={formData.lead_time_days}
                      onChange={handleInputChange}
                      aria-describedby="leadTimeFeedback"
                    />

                    <div id="leadTimeFeedback" className="invalid-feedback">
                      {errors.lead_time_days}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="addFormSubmitButton d-flex justify-content-end">
                <button type="submit" className="btn btn-primary">
                  Tambahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Table HeaderProps={COLUMNS} data={MOCK_DATA}></Table>
    </>
  );
};

export default AddProductPage;
