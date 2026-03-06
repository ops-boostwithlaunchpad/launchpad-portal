"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
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

export function Button({ variant = "primary", size = "md", children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-medium cursor-pointer transition-all duration-150 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
