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
          value: value,
        },
      ];
    });
  };

  return (
    <>
      <form className="w-full md:w-48">
        <label htmlFor="statusFilter" className="labelWillHidden">
          Sortir berdasarkan status
        </label>

        <select
          id="statusFilter"
          onChange={handleStatusChange}
          className="rounded-md
          border
          border-slate-300
          bg-white
          px-3
          py-2
          text-sm
          text-slate-700
          outline-none
          transition
          focus:border-slate-400
          focus:ring-0
          w-full"
        >
          <option value="-">-</option>
          <option value={2}>Stock Aman</option>
          <option value={1}>Stock Menipis</option>
          <option value={0}>Stock Habis</option>
        </select>
      </form>
    </>
  );
};

export default Filter;
