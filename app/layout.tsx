import "./globals.css";
import "./utv-discovery-system.css";
import "./utv-pack2.css";
import "./utv-pack3.css";
import "./vuewe-theme.css";
import "./vuewe-feed.css";
import "./vuewe-profile.css";
import "./vuewe-polish-v2.css";
import "./vuewe-premium-v3.css";
import "./vuewe-premium-v4.css";
import "./vuewe-premium-v5.css";
import "./vuewe-app-shell.css";
import "./vuewe-polish-v6.css";
import "./vuewe-polish-v7.css";
import UTVLiveTruthSync from "./components/UTVLiveTruthSync";
import UTVNotificationBootstrap from "./components/UTVNotificationBootstrap";
import UTVRealtimeBridge from "./components/UTVRealtimeBridge";
import UTVAppShell from "./components/UTVAppShell";
import VUEWENav from "./components/VUEWENav";
import VUEWEExperienceShell from "./components/VUEWEExperienceShell";
import VUEWELivingProfileSystem from "./components/VUEWELivingProfileSystem";
import VUEWEProfileVideoRuntime from "./components/VUEWEProfileVideoRuntime";

export const metadata = {
  title: "VUEWE - Your View. Our World.",
  description:
    "VUEWE is a brighter social world for real people, creators, communities, live moments, discovery, entertainment, and connection.",
  manifest: "/manifest.json",
  themeColor: "#f7f8fa",
  appleWebApp: {
    capable: true,
    title: "VUEWE",
    statusBarStyle: "default",
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
        <UTVLiveTruthSync />
        <UTVAppShell />
        <UTVRealtimeBridge />
        <VUEWENav />
        <VUEWEExperienceShell />
        <VUEWEProfileVideoRuntime />
        <VUEWELivingProfileSystem />
        {children}
        <UTVNotificationBootstrap />
      </body>
    </html>
  );
}
