"use client";

import { loginUser } from "@/redux/features/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import api from "@/utils/axiosInstance";
import { Eye, EyeClosed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

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
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Registration failed");
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-base-200 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md bg-base-100 border border-base-content/10 rounded-2xl overflow-hidden shadow-lg p-6"
      >
        <h2 className="text-xl font-semibold text-base-content text-center">
          Create an Account
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Input Field Template */}
          {[
            {
              label: "Display Name",
              value: displayName,
              setter: setDisplayName,
              name: "displayName",
              type: "text",
            },
            {
              label: "Username",
              value: username,
              setter: (v: string) => setUsername(v.toLowerCase()),
              name: "username",
              type: "text",
            },
            {
              label: "Email",
              value: email,
              setter: (v: string) => setEmail(v.toLowerCase()),
              name: "email",
              type: "email",
            },
          ].map((field) => (
            <div key={field.name}>
              <input
                type={field.type}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.label}
                className={`
                  w-full h-10 px-4 text-sm rounded-xl
                  bg-base-300 text-base-content
                  outline-base-content/10 hover:outline
                  focus:outline
                  ${
                    errors[field.name]
                      ? "border border-red-500"
                      : "border border-base-content/10"
                  }
                `}
              />
              {errors[field.name] && (
                <p className="text-xs text-red-500 mt-1">
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`
                  w-full h-10 px-4 pr-10 text-sm rounded-xl
                  bg-base-300 text-base-content
                  outline-base-content/10 hover:outline
                  focus:outline
                  ${
                    errors.password
                      ? "border border-red-500"
                      : "border border-base-content/10"
                  }
                `}
              />
              <div
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-base-content opacity-60 hover:opacity-100"
              >
                {showPass ? <Eye size={18} /> : <EyeClosed size={18} />}
              </div>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full h-10 rounded-xl border border-base-content/10 bg-cyan-900 text-white cursor-pointer text-md font-semibold hover:opacity-90 transition"
          >
            Register
          </button>

          {error && <p className="text-center text-sm text-red-500">{error}</p>}
        </form>

        <p className="mt-6 text-center text-sm text-base-content/70 opacity-70">
          Already a whisperer?{" "}
          <Link
            href="/login"
            className="font-semibold text-white hover:opacity-80"
          >
            Login
          </Link>
        </p>

        {/* Accent Bar */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-cyan-900" />
      </motion.div>
    </div>
  );
}
