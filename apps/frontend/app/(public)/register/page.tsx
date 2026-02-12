"use client";

import { loginUser } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import api from "@/utils/axiosInstance";
import { Eye, EyeClosed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState("");

  const dispatch = useAppDispatch();
  const router = useRouter();

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    let valid = true;

    if (!displayName.trim()) {
      newErrors.displayName = "Display name is required";
      valid = false;
    }

    if (!username.trim()) {
      newErrors.username = "Username is required";
      valid = false;
    } else if (username.length < 3) {
      newErrors.username = "Must be at least 3 characters";
      valid = false;
    } else if (!/^[a-zA-Z][a-zA-Z0-9]{2,19}$/.test(username)) {
      newErrors.username =
        "Only letters & numbers allowed, must start with a letter";
      valid = false;
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Enter a valid email";
      valid = false;
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = "At least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    try {
      await api.post("/user/register", {
        displayName,
        username,
        email,
        password,
      });

      const res = await dispatch(loginUser({ email, password }));
      if (res.type === "auth/loginUser/fulfilled") {
        router.push("/chat");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-base-200">
      <div className="flex w-full md:w-1/2 lg:w-1/3 bg-base-100 rounded-2xl shadow-lg p-5 flex-col justify-center lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
          <h2 className="mt-5 text-center text-2xl font-bold tracking-tight">
            Create an Account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Display Name */}
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className={`w-full h-10 pl-3 pr-3 rounded-full border ${
                  errors.displayName ? "border-red-500" : "border-base-300"
                } bg-base focus:outline-none focus:ring-2 focus:ring-[#004030] transition`}
              />
              {errors.displayName && (
                <p className="text-red-500 font-light text-xs mt-1 absolute">
                  {errors.displayName}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="Username"
                className={`w-full h-10 pl-3 pr-3 rounded-full border ${
                  errors.username ? "border-red-500" : "border-base-300"
                } bg-base focus:outline-none focus:ring-2 focus:ring-[#004030] transition`}
              />
              {errors.username && (
                <p className="text-red-500 font-light text-xs mt-1 absolute">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="Email"
                className={`w-full h-10 pl-3 pr-3 rounded-full border ${
                  errors.email ? "border-red-500" : "border-base-300"
                } bg-base focus:outline-none focus:ring-2 focus:ring-[#004030] transition`}
              />
              {errors.email && (
                <p className="text-red-500 font-light text-xs mt-1 absolute">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-full h-10 pl-3 pr-10 rounded-full border ${
                  errors.password ? "border-red-500" : "border-base-300"
                } bg-base focus:outline-none focus:ring-2 focus:ring-[#004030] transition`}
              />
              <div
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600 hover:text-gray-900"
              >
                {showPass ? <Eye size={18} /> : <EyeClosed size={18} />}
              </div>
              {errors.password && (
                <p className="text-red-500 font-light text-xs mt-1 absolute">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Register Button */}
            <div>
              <button
                type="submit"
                className="w-full h-10 rounded-full bg-[#004030] text-white font-semibold shadow hover:opacity-90 transition"
              >
                Register
              </button>
            </div>

            {/* Global Error */}
            {error && (
              <p className="text-red-500 w-full text-center absolute -bottom-8 text-sm">
                {error}
              </p>
            )}
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Already a whisperer?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#004030] hover:opacity-90"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
