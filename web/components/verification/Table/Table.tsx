import {
  flexRender,
  tableFeatures,
  useTable,
  columnSizingFeature,
  columnResizingFeature,
  columnFilteringFeature,
  rowSortingFeature,
  createSortedRowModel,
  createFilteredRowModel,
  filterFn_equalsString,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_includesString,
  rowPaginationFeature,
  createPaginatedRowModel,
  type ColumnFiltersState,
} from "@tanstack/react-table";

import "./Table.css";
import SearchBar from "../TableUtility/SearchBar";
import Filter from "../TableUtility/Filter";
import UpArrow from "../Icons/UpArrow";
import DownArrow from "../Icons/DownArrow";
import UpDownArrow from "../Icons/UpDownArrow";
import LeftChevronArrow from "../Icons/LeftChevronArrow";
import RightChevronArrow from "../Icons/RightChevronArrow";
import DobuleLeftChevronArrow from "../Icons/DoubleLeftChevronArrow";
import DoubleRightChevronArrow from "../Icons/DoubleRightChevronArrow";
import { useState } from "react";

/**
 * Penggunaan Bisa Memanggil Table dengan beberapa parameter
 * HeaderProps: Header[]; // Template Header berbentuk [{}, {}, ...]
 * data: Object[]; // Data untuk diisi ke tabel
 *
 * -- Opsional Diisi --
 * withSearch?: boolean; // Apakah Menggunakan Searching
 * withFilter?: boolean; // Apakah Menggunakan Filter Status
 * withPagination?: boolean; // Apakah Menggunakan Paging
 * withAction?: boolean; // Apakah mau ada tombol aksi
 */

export interface Header {
  header: string; // Judul Kolom
  accessorKey: string; // string untuk mengakses data, cocokkan dengan kolom tabel supaya data bisa diambil
  enableColumnSearch?: boolean; // Menghilangkan Searching untuk Kolom itu
}

interface TableProps {
  HeaderProps: Header[]; // Template Header berbentuk [{}, {}, ...]
  data: Object[]; // Data untuk diisi ke tabel

  withSearch?: boolean; // Apakah Menggunakan Searching
  withFilter?: boolean; // Apakah Menggunakan Filter Status
  withPagination?: boolean; // Apakah Menggunakan Paging
  withAction?: boolean; // Apakah mau ada tombol aksi
}

const Table = ({
  data,
  HeaderProps,
  withSearch = true,
  withFilter = true,
  withPagination = true,
  withAction = true,
}: TableProps) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  const [columnFilters, setColumnFilter] = useState<ColumnFiltersState>([]);
  const equalsNumber = (row: any, columnId: string, filterValue: unknown) => {
    const value = row.getValue(columnId);

    return Number(value) == Number(filterValue);
  };

  const equalsBoolean = (row: any, columnId: string, filterValue: unknown) => {
    return row.getValue(columnId) === filterValue;
  };

  const features = tableFeatures({
    columnResizingFeature,
    columnSizingFeature,
    rowSortingFeature,
    columnFilteringFeature,
    rowPaginationFeature,

    filterFns: {
      includesString: filterFn_includesString,
      equalsString: filterFn_equalsString,
      inNumberRange: filterFn_inNumberRange,
      inDateRange: filterFn_inDateRange,
      equalsNumber,
      equalsBoolean,
    },

    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
  });

  const table = useTable({
    data,
    columns: HeaderProps,
    features,
    state: {
      columnFilters,
      pagination,
    },
    columnResizeMode: "onChange",

    onColumnFiltersChange: setColumnFilter,
    onPaginationChange: setPagination,
  });

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 tableContainer">
        <div className="searchContainer">
          {withSearch && (
            <SearchBar
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilter}
              columns={HeaderProps}
            />
          )}

          {withFilter && (
            <Filter
              setColumnFilters={setColumnFilter}
              columnFilters={columnFilters}
            />
          )}
        </div>

        <div>
          <div className="tableWrapper w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50 text-sm text-slate-600">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    <th scope="col" className="tableIndexing px-4 py-3">
                      #
                    </th>

                    {headerGroup.headers.map((header) => {
                      const isResizing = header.column.getIsResizing();

                      const isAnotherColumnResizing = headerGroup.headers.some(
                        (otherHeader) => otherHeader.column.getIsResizing(),
                      );

                      return (
                        <th
                          scope="col"
                          key={header.id}
                          className="px-4 py-3"
                          style={{
                            width: `${header.getSize()}px`,
                            position: "relative",
                          }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={
                                header.column.getCanSort()
                                  ? "sortable-header flex cursor-pointer items-center gap-1"
                                  : ""
                              }
                              onClick={header.column.getToggleSortingHandler()}
                              title={
                                header.column.getCanSort()
                                  ? header.column.getNextSortingOrder() ===
                                    "asc"
                                    ? "Next: Sort ascending"
                                    : header.column.getNextSortingOrder() ===
                                        "desc"
                                      ? "Next: Sort descending"
                                      : "Next: Clear sort"
                                  : undefined
                              }
                            >
                              <table.FlexRender header={header} />

                              {{
                                asc: <UpArrow width={15} />,
                                desc: <DownArrow width={15} />,
                              }[header.column.getIsSorted() as string] ?? (
                                <UpDownArrow width={15} />
                              )}
                            </div>
                          )}

                          <div
                            className={`sizeHandler ${isResizing ? "isResizing" : ""} ${isAnotherColumnResizing && !isResizing ? "resizeDisabled" : ""}`}
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                          />
                        </th>
                      );
                    })}

                    {withAction && (
                      <th
                        scope="col"
                        className="actionColumn px-4 py-3 text-right"
                        style={{
                          width: "180px",
                          minWidth: "180px",
                        }}
                      >
                        Action
                      </th>
                    )}
                  </tr>
                ))}
              </thead>

              <tbody>
                {table.getRowModel().rows.map((row, index) => (
                  <tr key={row.id} className="border-t">
                    <th className="tableIndexing px-4 py-3" scope="row">
                      {pagination.pageIndex * pagination.pageSize + index + 1}
                    </th>

                    {row.getAllCells().map((cell) => (
                      <td
                        key={cell.id}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}

                    {withAction && (
                      <td className="px-4 py-3">
                        <div className="actionTableWrapper flex justify-end gap-2">
                          <button
                            type="button"
                            className="adjustButton rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Adjust
                          </button>

                          <button
                            type="button"
                            className="historyButton rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {withPagination && (
            <div className="pagination sticky bottom-0 flex w-full items-center justify-between bg-white px-4 py-3">
              <div className="pageSize flex items-center gap-2 text-sm text-slate-600">
                <span>Banyak Item:</span>

                <select
                  value={pagination.pageSize}
                  onChange={(e) => {
                    table.setPageSize(Number(e.target.value));
                  }}
                  className="border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  hover:border-slate-400
                  focus:border-slate-400
                  focus:ring-1
                  focus:ring-slate-300
                  rounded-md"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="pageIndexing flex items-center gap-4 text-sm text-slate-600">
                <div className="prevPage flex items-center">
                  <button
                    type="button"
                    onClick={() => table.firstPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-l-md
                    border
                    border-slate-300
                    bg-white
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-40"
                  >
                    <DobuleLeftChevronArrow width={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    border
                    border-l-0
                    border-slate-300
                    bg-white
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-40"
                  >
                    <LeftChevronArrow width={20} />
                  </button>
                </div>

                <span className="whitespace-nowrap">
                  Halaman {pagination.pageIndex + 1} dari {table.getPageCount()}
                </span>

                <div className="nextPage flex items-center">
                  <button
                    type="button"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    border
                    border-slate-300
                    bg-white
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-40"
                  >
                    <RightChevronArrow width={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}
                    className="flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-r-md
                    border
                    border-l-0
                    border-slate-300
                    bg-white
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-40"
                  >
                    <DoubleRightChevronArrow width={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Table;
