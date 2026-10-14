import "./globals.css";

export const metadata = {
  title: "SDUI Forge",
  description: "Server-Driven UI Metadata Engine — Frontend Skeleton",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
