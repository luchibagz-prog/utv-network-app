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
import "./vuewe-watch-v20.css";
import "./vuewe-profile-v21.css";
import "./vuewe-profile-v22.css";
import "./vuewe-profile-v23.css";
import "./vuewe-polish-v24.css";
import "./vuewe-transition-v25.css";
import "./vuewe-live-v26.css";
import "./vuewe-live-relaunch-v27.css";
import "./vuewe-realtime-v28.css";
import "./vuewe-mobile-v29.css";
import "./vuewe-relaunch-v30.css";
import "./vuewe-first-run-v31.css";
import "./vuewe-profile-identity-v32.css";
import "./vuewe-seasonal-v34.css";
import UTVLiveTruthSync from "./components/UTVLiveTruthSync";
import UTVNotificationBootstrap from "./components/UTVNotificationBootstrap";
import UTVRealtimeBridge from "./components/UTVRealtimeBridge";
import UTVAppShell from "./components/UTVAppShell";
import VUEWENav from "./components/VUEWENav";
import VUEWEExperienceShell from "./components/VUEWEExperienceShell";
import VUEWELivingProfileSystem from "./components/VUEWELivingProfileSystem";
import VUEWEProfileVideoRuntime from "./components/VUEWEProfileVideoRuntime";
import VUEWEProfileThemeRuntime from "./components/VUEWEProfileThemeRuntime";
import VUEWEProfileAutoplayRuntime from "./components/VUEWEProfileAutoplayRuntime";
import VUEWEMockRuntime from "./components/VUEWEMockRuntime";
import VUEWEFidelityRuntime from "./components/VUEWEFidelityRuntime";
import VUEWEInteractionRuntime from "./components/VUEWEInteractionRuntime";
import VUEWEContentRuntime from "./components/VUEWEContentRuntime";
import VUEWEInstallBrandRuntime from "./components/VUEWEInstallBrandRuntime";
import VUEWERouteTransitionRuntime from "./components/VUEWERouteTransitionRuntime";
import VUEWELiveQualityRuntime from "./components/VUEWELiveQualityRuntime";
import VUEWELiveBrandRuntime from "./components/VUEWELiveBrandRuntime";
import VUEWERealtimeQualityRuntime from "./components/VUEWERealtimeQualityRuntime";
import VUEWEDeviceReadyRuntime from "./components/VUEWEDeviceReadyRuntime";
import VUEWEMobilePolishRuntime from "./components/VUEWEMobilePolishRuntime";
import VUEWELiveGiftRuntime from "./components/VUEWELiveGiftRuntime";
import VUEWEMonetizationRuntime from "./components/VUEWEMonetizationRuntime";
import VUEWEFirstRunSetup from "./components/VUEWEFirstRunSetup";
import VUEWEGreenScreenStudioV4 from "./components/VUEWEGreenScreenStudioV4";
import VUEWEUpgradePulse from "./components/VUEWEUpgradePulse";
import VUEWECreateLauncherRuntime from "./components/VUEWECreateLauncherRuntime";
import VUEWEIncomingCallRuntime from "./components/VUEWEIncomingCallRuntime";
import VUEWECommsReliabilityRuntime from "./components/VUEWECommsReliabilityRuntime";
import VUEWEBusinessReliabilityRuntime from "./components/VUEWEBusinessReliabilityRuntime";
import VUEWELaunchPolishRuntime from "./components/VUEWELaunchPolishRuntime";
import VUEWESocialVisualPolishRuntime from "./components/VUEWESocialVisualPolishRuntime";
import VUEWESeasonalFeedRuntime from "./components/VUEWESeasonalFeedRuntime";
import VUEWEProfileMomentsRuntime from "./components/VUEWEProfileMomentsRuntime";
import VUEWECreatorDashRuntime from "./components/VUEWECreatorDashRuntime";
import VUEWEProfileIdentityDockRuntime from "./components/VUEWEProfileIdentityDockRuntime";

export const metadata = {
  title: "VUEWE - Your View. Our World.",
  description:
    "VUEWE is a brighter social world for real people, creators, communities, live moments, discovery, entertainment, and connection.",
  manifest: "/manifest.json",
  themeColor: "#08111f",
  appleWebApp: {
    capable: true,
    title: "VUEWE",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/vuewe-icon.svg",
    apple: "/vuewe-icon.svg",
  },
};

const launchScript = `
(function () {
  try {
    var current = new URL(window.location.href);
    if (
      current.pathname === "/watch" &&
      current.searchParams.get("launch") !== "watch"
    ) {
      window.location.replace("/feed?launch=app");
    }
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: launchScript }} />
      </head>
      <body>
        <VUEWEFirstRunSetup />
        <UTVLiveTruthSync />
        <UTVAppShell />
        <VUEWEInstallBrandRuntime />
        <VUEWEDeviceReadyRuntime />
        <UTVRealtimeBridge />
        <VUEWENav />
        <VUEWEExperienceShell />
        <VUEWEProfileVideoRuntime />
        <VUEWEProfileThemeRuntime />
        <VUEWEProfileAutoplayRuntime />
        <VUEWELivingProfileSystem />
        <VUEWEMockRuntime />
        <VUEWEFidelityRuntime />
        <VUEWEInteractionRuntime />
        <VUEWEContentRuntime />
        <VUEWERouteTransitionRuntime />
        <VUEWELiveQualityRuntime />
        <VUEWELiveBrandRuntime />
        <VUEWERealtimeQualityRuntime />
        <VUEWEMobilePolishRuntime />
        <VUEWELiveGiftRuntime />
        <VUEWEMonetizationRuntime />
        <VUEWEIncomingCallRuntime />
        <VUEWECommsReliabilityRuntime />
        <VUEWEBusinessReliabilityRuntime />
        <VUEWELaunchPolishRuntime />
        <VUEWESocialVisualPolishRuntime />
        <VUEWESeasonalFeedRuntime />
        <VUEWEProfileMomentsRuntime />
        <VUEWECreatorDashRuntime />
        <VUEWEProfileIdentityDockRuntime />
        {children}
        <VUEWEGreenScreenStudioV4 />
        <VUEWEUpgradePulse />
        <VUEWECreateLauncherRuntime />
        <UTVNotificationBootstrap />
      </body>
    </html>
  );
}
