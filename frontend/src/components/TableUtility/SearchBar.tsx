import "./SearchBar.css";
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

  const handleColumnChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const columnId = e.target.value;

    setSearchColumn(columnId);

    setColumnFilters((prev) => [
      ...prev.filter((filter) => filter.id !== searchColumn),
      ...(searchValue
        ? [{ id: columnId, value: searchValue }]
        : []),
    ]);
  };

  return (
    <>
      <form className="searchTitle" onSubmit={(e) => {e.preventDefault();}}>
        <label htmlFor="searchColumn" className="labelWillHidden">Cari berdasarkan kolom</label>

        <div className="form-group searchBarWrapper">
          <select
            className="filterSearch"
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

          <div className="searchBar">
            <SearchIcon width={20} color="grey" />

            <input
              className="form-control"
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
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default SearchBar;
