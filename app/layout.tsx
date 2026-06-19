import "./globals.css";

export const metadata = {
  title: "UTV - Urban Television",
  description:
    "Urban Television. Watch shows, movies, podcasts, music videos, documentaries, live events, and UTV originals.",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    title: "UTV",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/utv-logo.png",
    apple: "/utv-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}