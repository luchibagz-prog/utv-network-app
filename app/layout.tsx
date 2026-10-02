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
import "./vuewe-mock-v8.css";
import "./vuewe-mock-v9.css";
import "./vuewe-mock-v10.css";
import "./vuewe-unified-v11.css";
import "./vuewe-finish-v12.css";
import "./vuewe-profile-safe-v14.css";
import "./vuewe-profile-v15.css";
import "./vuewe-profile-v16.css";
import "./vuewe-fidelity-v18.css";
import "./vuewe-fidelity-v18b.css";
import "./vuewe-motion-v19.css";
import "./vuewe-motion-v19b.css";
import UTVLiveTruthSync from "./components/UTVLiveTruthSync";
import UTVNotificationBootstrap from "./components/UTVNotificationBootstrap";
import UTVRealtimeBridge from "./components/UTVRealtimeBridge";
import UTVAppShell from "./components/UTVAppShell";
import VUEWENav from "./components/VUEWENav";
import VUEWEExperienceShell from "./components/VUEWEExperienceShell";
import VUEWELivingProfileSystem from "./components/VUEWELivingProfileSystem";
import VUEWEProfileVideoRuntime from "./components/VUEWEProfileVideoRuntime";
import VUEWEProfileThemeRuntime from "./components/VUEWEProfileThemeRuntime";
import VUEWEMockRuntime from "./components/VUEWEMockRuntime";
import VUEWEFidelityRuntime from "./components/VUEWEFidelityRuntime";
import VUEWEInteractionRuntime from "./components/VUEWEInteractionRuntime";

export const metadata = {
  title: "VUEWE - Your View. Our World.",
  description:
    "VUEWE is a brighter social world for real people, creators, communities, live moments, discovery, entertainment, and connection.",
  manifest: "/manifest.json",
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    title: "VUEWE",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/vuewe-icon.svg",
    apple: "/vuewe-icon.svg",
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
        <VUEWEProfileThemeRuntime />
        <VUEWELivingProfileSystem />
        <VUEWEMockRuntime />
        <VUEWEFidelityRuntime />
        <VUEWEInteractionRuntime />
        {children}
        <UTVNotificationBootstrap />
      </body>
    </html>
  );
}
