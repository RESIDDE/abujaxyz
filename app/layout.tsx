import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AbujaCarsMail — Internal Email Platform",
  description: "Secure internal email platform for the AbujaСars team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: "Inter, sans-serif",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
