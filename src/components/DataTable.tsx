"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  mobileCard?: (item: T, index: number) => React.ReactNode;
}

export function ViewToggle({ view, onToggle }: { view: "table" | "cards"; onToggle: (v: "table" | "cards") => void }) {
  return (
    <div className="hidden md:inline-flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => onToggle("table")}
        className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
        title="Table view"
      >
        <List size={14} />
      </button>
      <button
        onClick={() => onToggle("cards")}
        className={`p-1.5 rounded-md transition-colors ${view === "cards" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
        title="Card view"
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );
}

export function DataTable<T>({ columns, data, onRowClick, mobileCard }: DataTableProps<T>) {
  const [desktopView, setDesktopView] = useState<"table" | "cards">("cards");

  return (
    <>
      {/* View toggle — desktop only, only when mobileCard is provided */}
      {mobileCard && (
        <div className="hidden md:flex justify-end mb-0 -mt-8">
          <ViewToggle view={desktopView} onToggle={setDesktopView} />
        </div>
      )}

      {/* Mobile: always cards if mobileCard provided */}
      {mobileCard && (
        <div className="md:hidden space-y-2.5">
          {data.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-xs">No data found.</p>
          )}
          {data.map((item, i) => mobileCard(item, i))}
        </div>
      )}

      {/* Desktop: cards view */}
      {mobileCard && desktopView === "cards" && (
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {data.length === 0 && (
            <p className="col-span-full text-center text-gray-400 py-8 text-xs">No data found.</p>
          )}
          {data.map((item, i) => mobileCard(item, i))}
        </div>
      )}

      {/* Desktop: table view (or always if no mobileCard) */}
      <div className={`overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${mobileCard ? (desktopView === "cards" ? "hidden" : "hidden md:block") : ""}`}>
        <table className="w-full border-collapse text-[12.5px] min-w-[600px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="min-w-[150px] text-left px-3 py-2 text-[9.5px] text-gray-500 uppercase tracking-wider border-b border-gray-200 font-semibold"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 align-middle ${col.className || ""}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-gray-400 py-8 text-xs">
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Card({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3.5">
          {title && (
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {title}
            </h3>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
