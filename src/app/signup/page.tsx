"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-100/50 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900">
            Launchpad<span className="text-indigo-500">.</span>
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-[3px] mt-1">
            Client Portal
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-center mb-1">Create Your Account</h2>
          <p className="text-xs text-gray-500 text-center mb-6">
            Sign up with the email from your onboarding form
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-indigo-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-16 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-indigo-500 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-16 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-indigo-500 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm py-3 px-4 rounded-xl transition-all disabled:opacity-40 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                  <>Create Account</>
              )}
            </button>
          </form>
        </div>

        {/* Sign in link */}
        <div className="text-center mt-5">
          <p className="text-xs text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-500 hover:text-indigo-600 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-[10px] text-gray-400">
            Boost with Launchpad &middot; Palm Beach Gardens, FL
          </p>
        </div>
      </div>
    </div>
  );
}
