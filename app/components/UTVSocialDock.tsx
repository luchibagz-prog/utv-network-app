"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/activity", icon: "🔔", label: "Activity" },
  { href: "/messages", icon: "💬", label: "Messages" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export default function UTVSocialDock() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="utvSocialDock" aria-label="UTV social controls">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`);

        return (
          <button
            type="button"
            key={item.href}
            className={active ? "active" : ""}
            onClick={() => router.push(item.href)}
          >
            <span>{item.icon}</span>
            <b>{item.label}</b>
          </button>
        );
      })}

      <style jsx global>{`
        .utvSocialDock {
          position: sticky;
          z-index: 500;
          top: max(8px, env(safe-area-inset-top));
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
          width: min(620px, calc(100% - 24px));
          margin: 10px auto 14px;
          padding: 7px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 21px;
          background: rgba(4,8,15,.9);
          box-shadow: 0 16px 45px rgba(0,0,0,.34);
          backdrop-filter: blur(22px);
        }

        .utvSocialDock button {
          min-width: 0;
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 15px;
          color: rgba(255,255,255,.68);
          font-size: 12px;
          font-weight: 900;
          background: transparent;
          cursor: pointer;
        }

        .utvSocialDock button span {
          font-size: 17px;
        }

        .utvSocialDock button.active {
          color: #06140f;
          background: linear-gradient(135deg,#52f7c8,#adff70);
          box-shadow: 0 8px 25px rgba(82,247,200,.22);
        }

        @media (max-width: 390px) {
          .utvSocialDock button {
            gap: 4px;
            font-size: 11px;
          }
        }
      `}</style>
    </nav>
  );
}
