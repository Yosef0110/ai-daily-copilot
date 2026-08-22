import "./Filter.css";

import type { ColumnFiltersState } from "@tanstack/react-table";

interface FilterProps {
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
}

const Filter = ({ setColumnFilters }: FilterProps) => {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setColumnFilters((prev) => {
      const filtersWithoutStatus = prev.filter(
        (filter) => filter.id !== "status",
      );

      if (value === "-") {
        return filtersWithoutStatus;
      }

      return [
        ...filtersWithoutStatus,
        {
          id: "status",
          value: value === "true",
        },
      ];
    });
  };
  return (
    <>
      <form className="filterSearch">
        <label className="labelWillHidden">Sortir berdasarkan status</label>
        <div className="form-group">
          <select
            className="form-control"
            id="statusFilter"
            onChange={handleStatusChange}
          >
            <option value="-">-</option>
            <option value="true">Stock Tersedia</option>
            <option value="false">Stock Habis</option>
          </select>
        </div>
      </form>
    </>
  );
};

export default Filter;
