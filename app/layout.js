import "./globals.css";

export const metadata = {
  title: "2 Truths 1 Lie",
  description: "Classroom voting game",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  );
}
