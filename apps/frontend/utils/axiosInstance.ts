import axios from "axios";

console.log("NEXT_PUBLIC_API :",process.env.NEXT_PUBLIC_API);

/**
 * Preconfigured Axios instance for API requests.
 * Authentication is handled entirely via HttpOnly cookies.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API,
  withCredentials: true,
});

export default api;
