"use client"

import { loginUser } from "@/redux/features/authSlice"
import { useAppDispatch } from "@/redux/hooks"
import { Eye, EyeClosed } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Errors = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState<string>("user1@gmail.com");
  const [password, setPassword] = useState<string>("12345678");
  const [error, setError] = useState<string>("");
  const [showPass, setShowPass] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({
    email: "",
    password: "",
  });

  const dispatch = useAppDispatch();
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const res = await dispatch(loginUser({ email, password })).unwrap();
      console.log("RES : ", res);
      router.push("/chat");
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    }
  };

  const validate = () => {
    let valid = true;
    const newErrors: Errors = { email: "", password: "" };

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
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  return (
    <div className="h-screen flex items-center justify-center bg-base-200">
      <div className="flex w-full md:w-1/2 lg:w-1/3 bg-base-100 rounded-2xl shadow-lg p-5 flex-col justify-center lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
          <h2 className="mt-5 text-center text-2xl font-bold tracking-tight">
            Login
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-6 relative">

            {/* Email Input */}
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className={`w-full h-10 pl-3 pr-3 rounded-full border ${
                  errors.email ? "border-red-500" : "border-base-300"
                } bg-base focus:outline-none focus:ring-2 focus:ring-[#004030] transition`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-red-500 font-light text-xs mt-1 absolute">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full h-10 pl-3 pr-10 rounded-full border ${
                  errors.password ? "border-red-500" : "border-base-300"
                } bg-base focus:outline-none focus:ring-2 focus:ring-[#004030] transition`}
                placeholder="Enter your password"
              />
              <div
                onClick={() => setShowPass((prev) => !prev)}
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

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                className="w-full h-10 rounded-full bg-[#004030] text-white font-semibold shadow hover:opacity-90 transition"
              >
                Sign in
              </button>
            </div>

            {/* Global error */}
            {error && (
              <p className="text-red-500 w-full text-center absolute -bottom-8 text-sm">
                {error}
              </p>
            )}
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Not a whisperer?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#004030] hover:opacity-90"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
