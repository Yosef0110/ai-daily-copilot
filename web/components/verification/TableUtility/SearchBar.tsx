import SearchIcon from "../Icons/SearchIcon";

import type { ColumnFiltersState } from "@tanstack/react-table";
import type { Header } from "../Table/Table";
import { useState } from "react";

interface SearchBarProps {
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  columns: Header[];
}

const SearchBar = ({ setColumnFilters, columns }: SearchBarProps) => {
  const [searchColumn, setSearchColumn] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const updateFilter = (columnId: string, value: string) => {
    if (!columnId) return;

    setColumnFilters((prev) => [
      ...prev.filter((filter) => filter.id !== columnId),
      ...(value ? [{ id: columnId, value }] : []),
    ]);
  };

  const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const columnId = e.target.value;

    setSearchColumn(columnId);

    setColumnFilters((prev) => [
      ...prev.filter((filter) => filter.id !== searchColumn),
      ...(searchValue ? [{ id: columnId, value: searchValue }] : []),
    ]);
  };

  return (
    <>
      <form
        className="w-full min-w-0 md:w-[60%] md:min-w-[45%]"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label htmlFor="searchColumn" className="labelWillHidden">
          Cari berdasarkan kolom
        </label>

        <div className="flex w-full gap-0">
          <select
            className="shrink-0
            rounded-l-md
            border
            border-r-0
            border-slate-300
            bg-white
            px-3
            py-2
            text-sm
            text-slate-700
            outline-none
            focus:border-slate-400
            focus:ring-0
            w-32"
            id="searchColumn"
            value={searchColumn}
            onChange={handleColumnChange}
          >
            <option value="" disabled hidden>
              Kolom
            </option>

            {columns
              .filter((column) => column.enableColumnSearch !== false)
              .map((column) => (
                <option key={column.accessorKey} value={column.accessorKey}>
                  {column.header}
                </option>
              ))}
          </select>

          <div className="relative min-w-0 flex-1">
            <SearchIcon
              width={20}
              color="grey"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />

            <input
              type="search"
              id="searchInput"
              placeholder="Cari..."
              aria-label="Kata pencarian"
              value={searchValue}
              onChange={(e) => {
                const value = e.target.value;

                setSearchValue(value);
                updateFilter(searchColumn, value);
              }}
              className="rounded-r-md
              border
              border-slate-300
              bg-white
              py-2
              pl-10
              pr-3
              text-sm
              outline-none
              placeholder:text-slate-400
              focus:border-slate-400
              focus:ring-0
              w-full"
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default SearchBar;
