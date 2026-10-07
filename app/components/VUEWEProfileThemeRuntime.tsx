"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getVueweProfile } from "../../lib/vueweProfileCache";

function profileEmailFromPath(pathname: string) {
  if (!pathname.startsWith("/u/")) return "";
  const segment = pathname.slice(3).split("/")[0] || "";
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export default function VUEWEProfileThemeRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    async function applyTheme() {
      const onProfile =
        pathname.startsWith("/u/") ||
        pathname === "/profile-pro-v12" ||
        pathname === "/profile-edit";

      if (!onProfile) {
        document.documentElement.style.removeProperty("--vuewe-profile-theme");
        document.documentElement.style.removeProperty("--vuewe-profile-accent");
        return;
      }

      let email = profileEmailFromPath(pathname);

      if (!email) {
        const { data } = await supabase.auth.getUser();
        email = data.user?.email || "";
      }

      if (!email || !active) return;

      const data = await getVueweProfile(email).catch(() => null);

      if (!active) return;

      const theme = String(data?.theme_color || "#111712").trim();
      const accent = String(data?.accent_color || "#24e86e").trim();

      document.documentElement.style.setProperty(
        "--vuewe-profile-theme",
        theme
      );
      document.documentElement.style.setProperty(
        "--vuewe-profile-accent",
        accent
      );
    }

    void applyTheme();

    return () => {
      active = false;
    };
  }, [pathname]);

  return null;
}
