import "./globals.css";
import UTVNotificationBootstrap from "./components/UTVNotificationBootstrap";

import UTVRealtimeBridge from "./components/UTVRealtimeBridge";
import UTVAppShell from "./components/UTVAppShell";
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
      <body>
          <UTVAppShell />
          <UTVRealtimeBridge />
        {children}
        <UTVNotificationBootstrap />
      </body>
    </html>
  );
}