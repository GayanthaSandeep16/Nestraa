"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  // Pass all three to render a Prev/Next footer (server-side pagination).
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage = "No records yet.",
  page,
  pageCount,
  onPageChange,
}: DataTableProps<T>) {
  const showPager = page != null && pageCount != null && onPageChange != null && pageCount > 1;

  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-surface-container-low">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn("px-md py-sm text-label-sm uppercase text-on-surface-variant", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-md py-lg text-center text-body-md text-on-surface-variant">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-outline-variant text-body-md text-on-surface",
                  onRowClick && "cursor-pointer hover:bg-surface-container-low"
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-md py-sm", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showPager && (
        <div className="flex items-center justify-end gap-sm border-t border-outline-variant bg-surface-container-low px-md py-sm text-label-sm text-on-surface-variant">
          <span>
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPageChange!(page! - 1)}
            disabled={page! <= 1}
            className="rounded border border-outline-variant px-sm py-xs disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange!(page! + 1)}
            disabled={page! >= pageCount!}
            className="rounded border border-outline-variant px-sm py-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
