"use client";

interface FormGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ label, children, className = "" }: FormGroupProps) {
  return (
    <div className={`mb-3 ${className}`}>
      <label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[#09090f] border border-[#242433] rounded-lg px-3 py-2 text-gray-200 text-[12.5px] outline-none transition-colors focus:border-indigo-500 placeholder:text-gray-600 ${props.className || ""}`}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-[#09090f] border border-[#242433] rounded-lg px-3 py-2 text-gray-200 text-[12.5px] outline-none transition-colors focus:border-indigo-500 ${props.className || ""}`}
    >
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-[#09090f] border border-[#242433] rounded-lg px-3 py-2 text-gray-200 text-[12.5px] outline-none transition-colors focus:border-indigo-500 resize-y min-h-[70px] placeholder:text-gray-600 ${props.className || ""}`}
    />
  );
}

export function Checkbox({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-1.5 text-[11.5px] cursor-pointer text-gray-200">
      <input type="checkbox" {...props} className="accent-indigo-500" />
      {label}
    </label>
  );
}
