"use client";

import UTVNav from "../components/UTVNav";
import UTVCommandRoom from "../components/UTVCommandRoom";
import UTVOwnerControlDeck from "../components/UTVOwnerControlDeck";

export default function FounderPage() {
  return (
    <main className="ownerPage">
      <UTVNav />

      <div className="ownerCanvas">
        <UTVCommandRoom mode="owner" />
        <UTVOwnerControlDeck />
      </div>

      <style jsx>{`
        .ownerPage {
          min-height: 100svh;
          overflow-x: hidden;
          color: white;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(244,207,101,.055),
              transparent 27%
            ),
            radial-gradient(
              circle at 100% 50%,
              rgba(108,78,255,.045),
              transparent 32%
            ),
            #040507;
        }

        .ownerCanvas {
          width: 100%;
          padding:
            1px 0
            max(
              110px,
              calc(
                82px +
                env(safe-area-inset-bottom)
              )
            );
        }
      `}</style>
    </main>
  );
}
