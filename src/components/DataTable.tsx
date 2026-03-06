"use client";

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
}

export function DataTable<T>({ columns, data, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
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
