export const metadata = {
  title: "STANAG Writing Test Simulator",
  description: "MVP pro přípravu na STANAG 6001 – psaní Level 3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
