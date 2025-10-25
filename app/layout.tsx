// /app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "STANAG Writing Test Simulator",
  description: "MVP pro přípravu na STANAG 6001 – psaní Level 3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* základní třídy pro lepší výchozí vzhled (funguje i bez nich, ale pomůže) */}
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
