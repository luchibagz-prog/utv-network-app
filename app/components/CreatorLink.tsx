"use client";

import { useRouter } from "next/navigation";

type Props = {
  email: string;
  name?: string;
  avatar?: string;
  size?: number;
};

export default function CreatorLink({
  email,
  name,
  avatar,
  size = 42,
}: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/u/${encodeURIComponent(email)}`)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#333",
            display: "grid",
            placeItems: "center",
            fontSize: size / 2,
          }}
        >
          👤
        </div>
      )}

      <strong>{name || email}</strong>
    </div>
  );
}