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
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage = "No records yet.",
}: DataTableProps<T>) {
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
    </div>
  );
}
