"use client";

type StoryCanvasProps = {
  previewUrl: string;
  isVideo: boolean;
};

export default function StoryCanvas({
  previewUrl,
  isVideo,
}: StoryCanvasProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#000",
      }}
    >
      {isVideo ? (
        <video
          src={previewUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <img
          src={previewUrl}
          alt="Story"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
    </div>
  );
}