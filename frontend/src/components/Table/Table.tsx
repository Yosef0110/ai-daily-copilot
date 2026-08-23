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
 *  Contoh bisa diliat di '../pages/AddProductPage.tsx'
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

  const getStatusClass = (status: number) => {
    switch (status) {
      case 2:
        return "status status-active";
      case 1:
        return "status status-low";
      case 0:
        return "status status-inactive";
      default:
        return "";
    }
  };


  console.log(columnFilters);
  return (
    <>
      <div className="container-sm tableContainer">
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

        <div className="tableWrapper">
          <table className="table table-bordered">
            <thead className="table-dark">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  <th scope="col" className="tableIndexing">
                    #
                  </th>
                  {headerGroup.headers.map((header) => (
                    <th
                      scope="col"
                      key={header.id}
                      style={{
                        width: `${header.getSize()}px`,
                        position: "relative",
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort() ? "sortable-header" : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                          title={
                            header.column.getCanSort()
                              ? header.column.getNextSortingOrder() === "asc"
                                ? "Next: Sort ascending"
                                : header.column.getNextSortingOrder() === "desc"
                                  ? "Next: Sort descending"
                                  : "Next: Clear sort"
                              : undefined
                          }
                        >
                          {" "}
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
                        className={`sizeHandler ${header.column.getIsResizing() ? "isResizing" : ""}`}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      />
                    </th>
                  ))}
                  {withAction && <th  className="actionColumn">Action</th>}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr key={row.id}>
                  <th className="tableIndexing" scope="row">
                    {pagination.pageIndex * pagination.pageSize + index + 1}
                  </th>
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={
                        cell.column.id === "status"
                          ? getStatusClass(cell.getValue<number>())
                          : ""
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}

                  {withAction && (
                    <td>
                      <div className="actionTableWrapper">
                        <button className="adjustButton">Adjust</button>
                        <button className="historyButton">History</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {withPagination && (
          <div className="pagination">
            <div className="pageSize">
              <span>Banyak Item: </span>
              <select
                defaultValue={25}
                value={pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value));
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="pageIndexing">
              <div className="prevPage">
                <button
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <DobuleLeftChevronArrow width={20} />
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <LeftChevronArrow width={20} />
                </button>
              </div>

              <span>
                Halaman {pagination.pageIndex + 1} dari {table.getPageCount()}
              </span>

              <div className="nextPage">
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <RightChevronArrow width={20} />
                </button>
                <button
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <DoubleRightChevronArrow width={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Table;
