import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import Box from "@mui/material/Box";
import { Toaster } from "@/components/ui/toast";
import { ThemeRegistry } from "@/theme/theme-registry";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Management",
  description: "Finance Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Box component="html" lang="en" className={`${montserrat.variable} ${geistMono.variable}`} sx={{ height: "100%" }}>
      <Box component="body" sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <ThemeRegistry>
          {children}
          <Toaster />
        </ThemeRegistry>
      </Box>
    </Box>
  );
}
