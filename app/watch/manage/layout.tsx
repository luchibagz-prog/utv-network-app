"use client";

import type {
  ReactNode,
} from "react";
import UTVAccessGate from "../../components/UTVAccessGate";

export default function WatchManageLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <UTVAccessGate level="owner">
      {children}
    </UTVAccessGate>
  );
}
