"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: "bg-indigo-500 text-white hover:bg-indigo-600",
  ghost: "bg-transparent text-gray-600 border border-gray-200 hover:text-gray-800 hover:border-gray-400",
  danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
};

const sizes = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3.5 py-1.5 text-xs",
};

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export function Button({ variant = "primary", size = "md", loading = false, children, className = "", disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-medium cursor-pointer transition-all duration-150 ${variants[variant]} ${sizes[size]} ${disabled || loading ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        {loading && <Spinner />}
        {children}
      </span>
    </button>
  );
}
