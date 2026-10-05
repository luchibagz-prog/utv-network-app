"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function VUEWECreateLauncherRuntime() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const create = target?.closest?.(".vueweNavItem.isCreate") as HTMLElement | null;
      if (!create) return;

      event.preventDefault();
      event.stopPropagation();

      if (pathname !== "/create") {
        router.push("/create");
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  return null;
}
