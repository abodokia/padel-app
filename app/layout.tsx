import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: '#F2F2F7' }}>
        {children}
      </body>
    </html>
  );
}
