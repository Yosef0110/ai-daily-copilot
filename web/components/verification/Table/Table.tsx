"use client";

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
  type ColumnDef,
  type TableOptions,
} from "@tanstack/react-table";

import { useState } from "react";

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

export type Header = {
  header: string;
  accessorKey: string;
  enableColumnSearch?: boolean;
  cell?: any;
  filterFn?: any;
};

interface TableProps<TData> {
  HeaderProps: Header[];
  data: TData[];

  withSearch?: boolean;
  withFilter?: boolean;
  withPagination?: boolean;
  withAction?: boolean;

  onAdjust?: (item: TData) => void;
  onHistory?: (item: TData) => void;
}

const Table = <TData,>({
  data,
  HeaderProps,
  withSearch = true,
  withFilter = true,
  withPagination = true,
  withAction = true,
  onAdjust,
  onHistory,
}: TableProps<TData>) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [columnFilters, setColumnFilter] =
    useState<ColumnFiltersState>([]);

  const equalsNumber = (
    row: any,
    columnId: string,
    filterValue: unknown,
  ) => {
    const value = row.getValue(columnId);

    return Number(value) === Number(filterValue);
  };

  const equalsBoolean = (
    row: any,
    columnId: string,
    filterValue: unknown,
  ) => {
    return row.getValue(columnId) === filterValue;
  };

  /* =======================================================
     TABLE FEATURES
  ======================================================= */

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

  /* =======================================================
     TABLE INSTANCE
  ======================================================= */

  const table = useTable({
    data,
    columns: HeaderProps as any,
    features,

    state: {
      columnFilters,
      pagination,
    },

    columnResizeMode: "onChange",

    onColumnFiltersChange: setColumnFilter,
    onPaginationChange: setPagination,
  });

  /* =======================================================
     SPECIAL COLUMNS
  ======================================================= */

  const monoColumns = ["sku", "updated_at"];

  /* =======================================================
     DATE FORMAT
  ======================================================= */

  const formatUpdatedAt = (value: unknown) => {
    if (!value) return "-";

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 tableContainer">
        {/* =================================================
            TOOLBAR
        ================================================== */}

        {(withSearch || withFilter) && (
          <div className="tableToolbar mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
            {withSearch && (
              <div className="searchBox">
                <SearchBar
                  columnFilters={columnFilters}
                  setColumnFilters={setColumnFilter}
                  columns={HeaderProps}
                />
              </div>
            )}

            {withFilter && (
              <div className="filterBox">
                <Filter
                  setColumnFilters={setColumnFilter}
                  columnFilters={columnFilters}
                />
              </div>
            )}
          </div>
        )}

        {/* =================================================
            TABLE
        ================================================== */}

        <div className="tableSection mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="tableWrapper w-full overflow-x-auto">
            <table
              className="dataTable border-collapse text-left"
              style={{
                tableLayout: "fixed",

                /*
                 * Table tidak boleh lebih kecil dari
                 * total ukuran column TanStack.
                 */
                width: `${Math.max(
                  table.getTotalSize(),
                  1000,
                )}px`,

                minWidth: "100%",
              }}
            >
              {/* =================================================
                  HEADER
              ================================================== */}

              <thead className="bg-slate-50">
                {table.getHeaderGroups().map(
                  (headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-slate-200"
                    >
                      {/* INDEX */}

                      <th
                        scope="col"
                        className="tableIndexing px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        #
                      </th>

                      {/* COLUMNS */}

                      {headerGroup.headers.map(
                        (header) => {
                          const isResizing =
                            header.column.getIsResizing();

                          const isAnotherColumnResizing =
                            headerGroup.headers.some(
                              (otherHeader) =>
                                otherHeader.column.getIsResizing(),
                            );

                          return (
                            <th
                              scope="col"
                              key={header.id}
                              className="relative px-5 py-4 text-center text-sm font-semibold text-slate-600"
                              style={{
                                width: `${header.getSize()}px`,
                              }}
                            >
                              {!header.isPlaceholder && (
                                <div
                                  className={
                                    header.column.getCanSort()
                                      ? "sortable-header flex cursor-pointer select-none items-center justify-center gap-1.5"
                                      : "flex items-center justify-center"
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
                                  <table.FlexRender
                                    header={header}
                                  />

                                  {header.column.getCanSort() && (
                                    <span className="flex shrink-0 items-center">
                                      {{
                                        asc: (
                                          <UpArrow width={15} />
                                        ),
                                        desc: (
                                          <DownArrow width={15} />
                                        ),
                                      }[
                                        header.column.getIsSorted() as string
                                      ] ?? (
                                        <UpDownArrow
                                          width={15}
                                        />
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* RESIZE */}

                              <div
                                className={`sizeHandler ${
                                  isResizing
                                    ? "isResizing"
                                    : ""
                                } ${
                                  isAnotherColumnResizing &&
                                  !isResizing
                                    ? "resizeDisabled"
                                    : ""
                                }`}
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                              />
                            </th>
                          );
                        },
                      )}

                      {/* ACTION */}

                      {withAction && (
                        <th
                          scope="col"
                          className="actionColumn px-5 py-4 text-right text-sm font-semibold text-slate-600"
                          style={{
                            width: "180px",
                            minWidth: "180px",
                            maxWidth: "180px",
                          }}
                        >
                          Action
                        </th>
                      )}
                    </tr>
                  ),
                )}
              </thead>

              {/* =================================================
                  BODY
              ================================================== */}

              <tbody>
                {table.getRowModel().rows.map(
                  (row, index) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                    >
                      {/* INDEX */}

                      <th
                        scope="row"
                        className="tableIndexing px-4 py-3 text-center text-sm font-medium text-slate-500"
                      >
                        {pagination.pageIndex *
                          pagination.pageSize +
                          index +
                          1}
                      </th>

                      {/* DATA */}

                      {row.getAllCells().map(
                        (cell) => (
                          <td
                            key={cell.id}
                            className={`tableCell px-4 py-3.5 text-center text-sm text-slate-700 ${
                              monoColumns.includes(
                                cell.column.id,
                              )
                                ? "font-mono text-[13px]"
                                : ""
                            }`}
                            style={{
                              width: `${cell.column.getSize()}px`,
                            }}
                          >
                            {cell.column.id ===
                            "updated_at"
                              ? formatUpdatedAt(
                                  cell.getValue(),
                                )
                              : flexRender(
                                  cell.column.columnDef
                                    .cell,
                                  cell.getContext(),
                                )}
                          </td>
                        ),
                      )}

                      {/* ACTION */}

                      {withAction && (
                        <td
                          className="px-4 py-3"
                          style={{
                            width: "180px",
                            minWidth: "180px",
                          }}
                        >
                          <div className="actionTableWrapper flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="adjustButton rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                              onClick={() =>
                                onAdjust?.(
                                  row.original,
                                )
                              }
                            >
                              Adjust
                            </button>

                            <button
                              type="button"
                              className="historyButton rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]"
                              onClick={() =>
                                onHistory?.(
                                  row.original,
                                )
                              }
                            >
                              History
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              PAGINATION
          ================================================== */}

          {withPagination && (
            <div className="pagination flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
              {/* PAGE SIZE */}

              <div className="pageSize flex items-center gap-2 text-sm text-slate-600">
                <span className="whitespace-nowrap">
                  Banyak Item:
                </span>

                <select
                  value={pagination.pageSize}
                  onChange={(e) => {
                    table.setPageSize(
                      Number(e.target.value),
                    );
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* PAGE NAVIGATION */}

              <div className="pageIndexing flex items-center gap-4 text-sm text-slate-600">
                <div className="prevPage flex items-center">
                  <button
                    type="button"
                    onClick={() =>
                      table.firstPage()
                    }
                    disabled={
                      !table.getCanPreviousPage()
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Halaman pertama"
                  >
                    <DobuleLeftChevronArrow
                      width={18}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      table.previousPage()
                    }
                    disabled={
                      !table.getCanPreviousPage()
                    }
                    className="-ml-px flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Halaman sebelumnya"
                  >
                    <LeftChevronArrow
                      width={18}
                    />
                  </button>
                </div>

                <span className="whitespace-nowrap font-medium text-slate-600">
                  Halaman{" "}
                  <span className="text-slate-900">
                    {pagination.pageIndex + 1}
                  </span>{" "}
                  dari{" "}
                  <span className="text-slate-900">
                    {table.getPageCount()}
                  </span>
                </span>

                <div className="nextPage flex items-center">
                  <button
                    type="button"
                    onClick={() =>
                      table.nextPage()
                    }
                    disabled={
                      !table.getCanNextPage()
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Halaman berikutnya"
                  >
                    <RightChevronArrow
                      width={18}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      table.lastPage()
                    }
                    disabled={
                      !table.getCanNextPage()
                    }
                    className="-ml-px flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Halaman terakhir"
                  >
                    <DoubleRightChevronArrow
                      width={18}
                    />
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