"use client";

type Props = {
  role?: string;
};

export default function UTVRoleChip({
  role = "CEO",
}: Props) {
  return (
    <span
      className="utvRoleChip"
      aria-label={`UTV ${role}`}
    >
      <span className="roleSeal">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M4 16 3 7l5 4 4-7 4 7 5-4-1 9H4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M5 19h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className="roleWord">
        {role}
      </span>

      <span className="roleLight" />

      <style jsx>{`
        .utvRoleChip {
          position: relative;

          height: 30px;
          min-width: 69px;

          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          padding: 0 11px 0 8px;

          border-radius: 10px;

          border:
            1px solid
            rgba(225, 184, 84, .50);

          background:
            radial-gradient(
              circle at 20% 0%,
              rgba(255,255,255,.09),
              transparent 40%
            ),
            linear-gradient(
              145deg,
              rgba(31,27,18,.98),
              rgba(8,9,12,.99) 52%,
              rgba(20,16,10,.98)
            );

          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.08),
            inset 0 -1px 0
              rgba(0,0,0,.7),
            0 4px 10px
              rgba(0,0,0,.34),
            0 0 7px
              rgba(209,160,49,.09);

          color: #f3d47d;

          overflow: hidden;
          isolation: isolate;
        }

        .utvRoleChip::before {
          content: "";

          position: absolute;
          inset: 1px;

          border-radius: 9px;

          border:
            1px solid
            rgba(255,232,166,.07);

          pointer-events: none;
        }

        .roleSeal {
          width: 17px;
          height: 17px;

          display: grid;
          place-items: center;

          color: #eac968;

          filter:
            drop-shadow(
              0 1px 2px
              rgba(0,0,0,.5)
            );
        }

        .roleSeal svg {
          width: 15px;
          height: 15px;
        }

        .roleWord {
          color: #f5edd8;

          font-size: 11px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .roleLight {
          position: absolute;

          width: 3px;
          height: 3px;

          right: 6px;
          top: 6px;

          border-radius: 50%;

          background: #61efd2;

          box-shadow:
            0 0 5px
              rgba(97,239,210,.8);
        }

        .utvRoleChip::after {
          content: "";

          position: absolute;

          top: -60%;
          left: -40%;

          width: 18%;
          height: 220%;

          transform: rotate(19deg);

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,.45),
              transparent
            );

          animation:
            roleSweep
            7s ease-in-out
            infinite;
        }

        @keyframes roleSweep {
          0%, 72% {
            left: -40%;
            opacity: 0;
          }

          78% {
            opacity: .55;
          }

          91% {
            left: 130%;
            opacity: .1;
          }

          100% {
            left: 130%;
            opacity: 0;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .utvRoleChip::after {
            animation: none;
          }
        }
      `}</style>
    </span>
  );
}
