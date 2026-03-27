import { Inter, Poppins, Modak, Jersey_10, Romanesco } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400","500","600","700"],
  variable: "--font-poppins",
});

export const modak = Modak({
  subsets: ["latin"],
  weight: ["400"],
});

export const romanesco = Romanesco({
     subsets: ["latin"],
  weight: ["400"],
})