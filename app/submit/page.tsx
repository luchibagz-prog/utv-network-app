"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Destination = "story" | "feed" | "profile" | "world";
type CameraFacing = "user" | "environment";

type TextLayer = {
  id: string;
  text: string;
  color: string;
  size: number;
  x: number;
  y: number;
  shadow: boolean;
};

type StickerLayer = {
  id: string;
  value: string;
  size: number;
  x: number;
  y: number;
};

const createOptions = [
  {
    title: "Feed Post",
    icon: "📱",
    desc: "Share a photo, video, or update.",
    type: "feed",
  },
  {
    title: "Story",
    icon: "📖",
    desc: "Share a 24-hour story.",
    type: "story",
  },
  {
    title: "Paste Link",
    icon: "🔗",
    desc: "Share YouTube, Vimeo, MP4, images, or flyers.",
    type: "link",
  },
  {
    title: "TV Show",
    icon: "🎬",
    desc: "Upload a premium episode.",
    type: "show",
  },
  {
    title: "Movie",
    icon: "🎥",
    desc: "Upload a movie or short film.",
    type: "movie",
  },
  {
    title: "Podcast",
    icon: "🎤",
    desc: "Upload a podcast episode.",
    type: "podcast",
  },
  {
    title: "Music Video",
    icon: "🎵",
    desc: "Post music and visuals.",
    type: "music",
  },
  {
    title: "Sports",
    icon: "🏀",
    desc: "Post sports content.",
    type: "sports",
  },
  {
    title: "Comedy",
    icon: "😂",
    desc: "Post comedy or skits.",
    type: "comedy",
  },
  {
    title: "Go Live",
    icon: "🔴",
    desc: "Broadcast now.",
    route: "/live-room",
  },
  {
    title: "Event",
    icon: "🎉",
    desc: "Promote an event.",
    route: "/events/new",
  },
  {
    title: "Casting",
    icon: "🎭",
    desc: "Find talent.",
    route: "/casting/new",
  },
  {
    title: "Build Together",
    icon: "🤝",
    desc: "Find collaborators.",
    route: "/collabs/new",
  },
];

const categoryOptions = [
  "Feed",
  "Music",
  "Comedy",
  "Sports",
  "Skits",
  "Business Promo",
  "Event Promo",
  "Live Replay",
  "Live Event",
  "Podcast",
  "Show",
  "Movie",
];

const textColors = [
  "#ffffff",
  "#52f7c8",
  "#7b61ff",
  "#ffd166",
  "#ff5ca8",
  "#ff5f57",
  "#111111",
];

const stickerChoices = [
  "🔥",
  "💯",
  "🎬",
  "🎵",
  "⭐",
  "👑",
  "😂",
  "❤️",
  "📍",
  "🎤",
  "🏆",
  "✨",
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function cleanFileName(name: string) {
  return name
    .replaceAll(" ", "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "")
    .toLowerCase();
}

function isImageLink(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
}

function isVideoLink(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);
}

function isAudioLink(url: string) {
  return /\.(mp3|m4a|wav|aac|ogg)(\?.*)?$/i.test(url);
}

function isEmbedLink(url: string) {
  const lower = url.toLowerCase();

  return (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    lower.includes("tiktok.com") ||
    lower.includes("instagram.com")
  );
}

export default function SubmitPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const draggingTextRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  const draggingStickerRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [mode, setMode] = useState("hub");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [linkUrl, setLinkUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Feed");

  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState("");
  const [stickers, setStickers] = useState<StickerLayer[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState("");

  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [drawingColor, setDrawingColor] = useState("#ffffff");
  const [drawingWidth, setDrawingWidth] = useState(5);

  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPreview, setMusicPreview] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [showMusicPanel, setShowMusicPanel] = useState(false);

  const [storyDuration, setStoryDuration] = useState(5);

  const [destinations, setDestinations] = useState<
    Record<Destination, boolean>
  >({
    story: false,
    feed: true,
    profile: true,
    world: false,
  });

  const [worldType, setWorldType] = useState("Feed");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");

  const [cameraFacing, setCameraFacing] =
    useState<CameraFacing>("environment");

  const [recording, setRecording] = useState(false);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedText = textLayers.find(
    (layer) => layer.id === selectedTextId
  );

  const selectedSticker = stickers.find(
    (sticker) => sticker.id === selectedStickerId
  );

  const selectedDestinations = useMemo(() => {
    return Object.entries(destinations)
      .filter(([, selected]) => selected)
      .map(([name]) => name);
  }, [destinations]);

  const previewUrl = preview || linkUrl.trim();

  const previewIsVideo =
    Boolean(file?.type.startsWith("video")) ||
    isVideoLink(previewUrl) ||
    isEmbedLink(previewUrl);

  const previewIsImage =
    Boolean(file?.type.startsWith("image")) ||
    isImageLink(previewUrl);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");

    if (type) {
      startCreate(type);
    }

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      if (musicPreview.startsWith("blob:")) {
        URL.revokeObjectURL(musicPreview);
      }
    };
  }, [preview, musicPreview]);

  function resetCreator() {
    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    if (musicPreview.startsWith("blob:")) {
      URL.revokeObjectURL(musicPreview);
    }

    stopCamera();

    setMode("hub");
    setFile(null);
    setPreview("");
    setLinkUrl("");
    setCoverUrl("");

    setTitle("");
    setCaption("");
    setCategory("Feed");

    setTextLayers([]);
    setSelectedTextId("");
    setStickers([]);
    setSelectedStickerId("");

    setDrawingEnabled(false);
    clearDrawing();

    setMusicFile(null);
    setMusicPreview("");
    setMusicUrl("");
    setMusicTitle("");
    setMusicArtist("");
    setShowMusicPanel(false);

    setStoryDuration(5);

    setDestinations({
      story: false,
      feed: true,
      profile: true,
      world: false,
    });

    setWorldType("Feed");
    setCity("");
    setStateName("");
    setMessage("");
  }

  function startCreate(type: string) {
    const categoryMap: Record<string, string> = {
      feed: "Feed",
      story: "Feed",
      show: "Show",
      movie: "Movie",
      podcast: "Podcast",
      music: "Music",
      sports: "Sports",
      comedy: "Comedy",
      link: "Feed",
    };

    setCategory(categoryMap[type] || "Feed");

    if (type === "story") {
      setDestinations({
        story: true,
        feed: false,
        profile: false,
        world: false,
      });
    } else {
      setDestinations({
        story: false,
        feed: true,
        profile: true,
        world: false,
      });
    }

    if (type === "link") {
      stopCamera();
      setMode("link");
      return;
    }

    setMode("camera");

    setTimeout(() => {
      startCamera();
    }, 200);
  }

  async function startCamera(
    facing: CameraFacing = cameraFacing
  ) {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraFacing(facing);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Allow camera and microphone permissions.");
    }
  }

  function stopCamera() {
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }

  async function flipCamera() {
    const next =
      cameraFacing === "user" ? "environment" : "user";

    await startCamera(next);
  }

  function pickFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const picked = event.target.files?.[0];

    if (!picked) return;

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setLinkUrl("");
    stopCamera();
    setMode("preview");
    setMessage("");
  }

  function pickMusicFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const picked = event.target.files?.[0];

    if (!picked) return;

    if (!picked.type.startsWith("audio/")) {
      setMessage("Choose an MP3, M4A, WAV, AAC, or OGG audio file.");
      return;
    }

    if (musicPreview.startsWith("blob:")) {
      URL.revokeObjectURL(musicPreview);
    }

    setMusicFile(picked);
    setMusicPreview(URL.createObjectURL(picked));
    setMusicUrl("");

    if (!musicTitle) {
      setMusicTitle(
        picked.name.replace(/\.[^/.]+$/, "")
      );
    }

    setShowMusicPanel(true);
    setMessage("");
  }

  function removeMusic() {
    if (musicPreview.startsWith("blob:")) {
      URL.revokeObjectURL(musicPreview);
    }

    setMusicFile(null);
    setMusicPreview("");
    setMusicUrl("");
    setMusicTitle("");
    setMusicArtist("");
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    if (cameraFacing === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const capturedFile = new File(
          [blob],
          `utv-photo-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
        setMode("preview");
      },
      "image/jpeg",
      0.92
    );
  }

  function startRecording() {
    if (!streamRef.current) {
      setMessage("Camera is not ready.");
      return;
    }

    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported(
      "video/webm;codecs=vp9,opus"
    )
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined
    );

    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "video/webm",
      });

      const recordedFile = new File(
        [blob],
        `utv-video-${Date.now()}.webm`,
        {
          type: mimeType || "video/webm",
        }
      );

      setFile(recordedFile);
      setPreview(URL.createObjectURL(blob));

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      setMode("preview");
    };

    recorder.start();
    setRecording(true);
    setMessage("");
  }

  function stopRecording() {
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }
  }

  function toggleDestination(destination: Destination) {
    setDestinations((current) => ({
      ...current,
      [destination]: !current[destination],
    }));
  }

  function addTextLayer() {
    const value = window.prompt("Type your text");

    if (!value?.trim()) return;

    const layer: TextLayer = {
      id: makeId("text"),
      text: value.trim(),
      color: "#ffffff",
      size: 32,
      x: 50,
      y: 40,
      shadow: true,
    };

    setTextLayers((current) => [...current, layer]);
    setSelectedTextId(layer.id);
  }

  function updateSelectedText(
    changes: Partial<TextLayer>
  ) {
    if (!selectedTextId) return;

    setTextLayers((current) =>
      current.map((layer) =>
        layer.id === selectedTextId
          ? { ...layer, ...changes }
          : layer
      )
    );
  }

  function deleteSelectedText() {
    if (!selectedTextId) return;

    setTextLayers((current) =>
      current.filter((layer) => layer.id !== selectedTextId)
    );

    setSelectedTextId("");
  }

  function addSticker(value: string) {
    const sticker: StickerLayer = {
      id: makeId("sticker"),
      value,
      size: 48,
      x: 50,
      y: 55,
    };

    setStickers((current) => [...current, sticker]);
    setSelectedStickerId(sticker.id);
  }

  function updateSelectedSticker(
    changes: Partial<StickerLayer>
  ) {
    if (!selectedStickerId) return;

    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === selectedStickerId
          ? { ...sticker, ...changes }
          : sticker
      )
    );
  }

  function deleteSelectedSticker() {
    if (!selectedStickerId) return;

    setStickers((current) =>
      current.filter(
        (sticker) => sticker.id !== selectedStickerId
      )
    );

    setSelectedStickerId("");
  }
    function beginTextDrag(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.TouchEvent<HTMLDivElement>,
    layer: TextLayer
  ) {
    const point =
      "touches" in event ? event.touches[0] : event;

    draggingTextRef.current = {
      id: layer.id,
      startX: point.clientX,
      startY: point.clientY,
      originalX: layer.x,
      originalY: layer.y,
    };

    setSelectedTextId(layer.id);
    setSelectedStickerId("");
  }

  function moveText(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.TouchEvent<HTMLDivElement>
  ) {
    const drag = draggingTextRef.current;

    if (!drag) return;

    const point =
      "touches" in event ? event.touches[0] : event;

    const bounds =
      event.currentTarget.parentElement?.getBoundingClientRect();

    if (!bounds) return;

    const moveX =
      ((point.clientX - drag.startX) / bounds.width) * 100;

    const moveY =
      ((point.clientY - drag.startY) / bounds.height) * 100;

    setTextLayers((current) =>
      current.map((layer) =>
        layer.id === drag.id
          ? {
              ...layer,
              x: Math.min(
                94,
                Math.max(6, drag.originalX + moveX)
              ),
              y: Math.min(
                94,
                Math.max(6, drag.originalY + moveY)
              ),
            }
          : layer
      )
    );
  }

  function endTextDrag() {
    draggingTextRef.current = null;
  }

  function beginStickerDrag(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.TouchEvent<HTMLDivElement>,
    sticker: StickerLayer
  ) {
    const point =
      "touches" in event ? event.touches[0] : event;

    draggingStickerRef.current = {
      id: sticker.id,
      startX: point.clientX,
      startY: point.clientY,
      originalX: sticker.x,
      originalY: sticker.y,
    };

    setSelectedStickerId(sticker.id);
    setSelectedTextId("");
  }

  function moveSticker(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.TouchEvent<HTMLDivElement>
  ) {
    const drag = draggingStickerRef.current;

    if (!drag) return;

    const point =
      "touches" in event ? event.touches[0] : event;

    const bounds =
      event.currentTarget.parentElement?.getBoundingClientRect();

    if (!bounds) return;

    const moveX =
      ((point.clientX - drag.startX) / bounds.width) * 100;

    const moveY =
      ((point.clientY - drag.startY) / bounds.height) * 100;

    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === drag.id
          ? {
              ...sticker,
              x: Math.min(
                94,
                Math.max(6, drag.originalX + moveX)
              ),
              y: Math.min(
                94,
                Math.max(6, drag.originalY + moveY)
              ),
            }
          : sticker
      )
    );
  }

  function endStickerDrag() {
    draggingStickerRef.current = null;
  }

  function resizeDrawingCanvas() {
    const canvas = drawingCanvasRef.current;

    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, bounds.width * ratio);
    canvas.height = Math.max(1, bounds.height * ratio);

    const context = canvas.getContext("2d");

    if (!context) return;

    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  function beginDrawing(
    event:
      | React.PointerEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!drawingEnabled) return;

    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const point =
      "touches" in event ? event.touches[0] : event;

    const bounds = canvas.getBoundingClientRect();

    context.beginPath();
    context.moveTo(
      point.clientX - bounds.left,
      point.clientY - bounds.top
    );

    drawingRef.current = true;
  }

  function draw(
    event:
      | React.PointerEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!drawingEnabled || !drawingRef.current) return;

    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const point =
      "touches" in event ? event.touches[0] : event;

    const bounds = canvas.getBoundingClientRect();

    context.strokeStyle = drawingColor;
    context.lineWidth = drawingWidth;

    context.lineTo(
      point.clientX - bounds.left,
      point.clientY - bounds.top
    );

    context.stroke();
  }

  function endDrawing() {
    drawingRef.current = false;
  }

  function clearDrawing() {
    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  function drawingDataUrl() {
    const canvas = drawingCanvasRef.current;

    if (!canvas) return "";

    try {
      return canvas.toDataURL("image/png");
    } catch {
      return "";
    }
  }

  async function uploadFileToBucket(
    bucket: string,
    folder: string,
    selectedFile: File
  ) {
    const filePath = `${folder}/${Date.now()}-${cleanFileName(
      selectedFile.name
    )}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, selectedFile, {
        upsert: false,
        contentType: selectedFile.type,
      });

    if (error) {
      throw error;
    }

    return supabase.storage
      .from(bucket)
      .getPublicUrl(filePath).data.publicUrl;
  }

  async function uploadMedia(): Promise<{
    mediaUrl: string;
    mediaType: "image" | "video" | "embed" | "link";
    thumbnail: string;
  }> {
    if (linkUrl.trim()) {
      const cleanLink = linkUrl.trim();

      return {
        mediaUrl: cleanLink,
        mediaType: isImageLink(cleanLink)
          ? "image"
          : isVideoLink(cleanLink)
          ? "video"
          : isEmbedLink(cleanLink)
          ? "embed"
          : "link",
        thumbnail:
          coverUrl.trim() ||
          (isImageLink(cleanLink) ? cleanLink : ""),
      };
    }

    if (!file) {
      throw new Error("Choose a photo or video first.");
    }

    const mediaUrl = await uploadFileToBucket(
      "uploads",
      "creator-posts",
      file
    );

    return {
      mediaUrl,
      mediaType: file.type.startsWith("image")
        ? "image"
        : "video",
      thumbnail: coverUrl.trim(),
    };
  }

  async function uploadMusic() {
    if (musicFile) {
      return uploadFileToBucket(
        "story-music",
        "audio",
        musicFile
      );
    }

    if (musicUrl.trim()) {
      if (!isAudioLink(musicUrl.trim())) {
        throw new Error(
          "Use a direct MP3, M4A, WAV, AAC, or OGG music link."
        );
      }

      return musicUrl.trim();
    }

    return "";
  }

  async function submitPost() {
    if (!selectedDestinations.length) {
      setMessage("Choose where you want to share this.");
      return;
    }

    setPosting(true);
    setMessage("");

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const user = authData.user;

      if (!user?.email) {
        router.push("/login");
        return;
      }

      const userEmail = user.email;
      const media = await uploadMedia();
      const finalMusicUrl = await uploadMusic();

      const serializedTextLayers = textLayers.map(
        (layer) => ({
          id: layer.id,
          text: layer.text,
          color: layer.color,
          size: layer.size,
          x: layer.x,
          y: layer.y,
          shadow: layer.shadow,
        })
      );

      const serializedStickers = stickers.map(
        (sticker) => ({
          id: sticker.id,
          value: sticker.value,
          size: sticker.size,
          x: sticker.x,
          y: sticker.y,
        })
      );

      const finalCaption = caption.trim();
      const premiumCategories = [
        "Show",
        "Movie",
        "Podcast",
        "Live Event",
      ];

      const needsApproval =
        premiumCategories.includes(category);

      const isVideo =
        media.mediaType === "video" ||
        media.mediaType === "embed" ||
        media.mediaType === "link";

      let uploadId = "";

      if (destinations.feed || destinations.profile) {
        const visibility =
          destinations.feed && destinations.profile
            ? "feed"
            : destinations.profile
            ? "profile"
            : "feed";

        const { data: uploadRow, error: uploadError } =
          await supabase
            .from("uploads")
            .insert({
              title: title.trim() || "UTV Post",
              description: finalCaption,
              category,
              creator_email: userEmail,
              video_url: isVideo ? media.mediaUrl : "",
              thumbnail_url:
                media.thumbnail ||
                (media.mediaType === "image"
                  ? media.mediaUrl
                  : ""),
              cover_url: media.thumbnail || "",
              media_url: media.mediaUrl,
              file_url: media.mediaUrl,
              external_url: linkUrl.trim() || "",
              visibility,
              content_type: category,
              needs_approval: needsApproval,
              approved: !needsApproval,
            })
            .select("id")
            .single();

        if (uploadError) throw uploadError;

        uploadId = uploadRow?.id || "";
      }

      if (destinations.story) {
        const { error: storyError } = await supabase
          .from("stories")
          .insert({
            user_email: userEmail,
            media_url: media.mediaUrl,
            media_type:
              media.mediaType === "image"
                ? "image"
                : "video",
            caption: finalCaption,
            music_url: finalMusicUrl || null,
            music_title:
              [musicTitle.trim(), musicArtist.trim()]
                .filter(Boolean)
                .join(" — ") || null,
            text_overlay: serializedTextLayers,
            stickers: serializedStickers,
            drawing_data: drawingDataUrl() || null,
            duration_seconds: storyDuration,
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          });

        if (storyError) throw storyError;
      }

      if (destinations.world) {
        const { error: worldError } = await supabase
          .from("world_posts")
          .insert({
            creator_email: userEmail,
            title: title.trim() || "UTV World Post",
            description: finalCaption,
            world_type: worldType || category || "Feed",
            city,
            state: stateName,
            location:
              city || stateName
                ? `${city}${
                    city && stateName ? ", " : ""
                  }${stateName}`
                : "UTV World",
            is_live: false,
            video_url: isVideo ? media.mediaUrl : "",
            media_url: media.mediaUrl,
            cover_url:
              media.thumbnail ||
              (media.mediaType === "image"
                ? media.mediaUrl
                : ""),
            flyer_url:
              media.mediaType === "image"
                ? media.mediaUrl
                : "",
          });

        if (worldError) throw worldError;
      }

      setMessage("Posted successfully.");

      setTimeout(() => {
        if (
          destinations.world &&
          !destinations.feed &&
          !destinations.story
        ) {
          router.push("/world");
          return;
        }

        if (
          destinations.profile &&
          !destinations.feed &&
          !destinations.story &&
          !destinations.world
        ) {
          router.push("/profile");
          return;
        }

        if (
          destinations.story &&
          !destinations.feed &&
          !destinations.profile &&
          !destinations.world
        ) {
          router.push("/feed");
          return;
        }

        if (uploadId) {
          router.push("/feed");
          return;
        }

        router.push("/feed");
      }, 700);
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message ||
          "Could not post your content to UTV."
      );
    } finally {
      setPosting(false);
    }
  }
    useEffect(() => {
    if (mode !== "preview") return;

    const timer = window.setTimeout(() => {
      resizeDrawingCanvas();
    }, 100);

    window.addEventListener("resize", resizeDrawingCanvas);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", resizeDrawingCanvas);
    };
  }, [mode]);

  if (mode === "hub") {
    return (
      <main className="submitPage">
        <UTVNav />
        <style>{styles}</style>

        <section className="createHero">
          <p className="eyebrow">UTV CREATOR</p>
          <h1>Create on UTV</h1>
          <p>
            Record, upload from your phone, share a link, create a story,
            promote an event, or go live.
          </p>
        </section>

        <section className="createGrid">
          {createOptions.map((item) => (
            <button
              key={item.title}
              className="createCard"
              onClick={() =>
                item.route
                  ? router.push(item.route)
                  : startCreate(item.type || "feed")
              }
            >
              <span className="createIcon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </button>
          ))}
        </section>
      </main>
    );
  }

  if (mode === "link") {
    return (
      <main className="submitPage">
        <UTVNav />
        <style>{styles}</style>

        <section className="linkShell">
          <button className="glassBtn backButton" onClick={resetCreator}>
            ← Back
          </button>

          <p className="eyebrow">LINK UPLOAD</p>
          <h1>Share a Link</h1>

          <p className="muted">
            Paste a direct video, image, YouTube, Vimeo, TikTok, Instagram, or
            hosted media link.
          </p>

          <input
            className="field"
            placeholder="Paste media link"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />

          <input
            className="field"
            placeholder="Cover or flyer URL — optional"
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
          />

          <input
            className="field"
            placeholder="Title — optional"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <textarea
            className="field captionField"
            placeholder="Caption — optional"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />

          <select
            className="field"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <section className="destinationPanel">
            <h3>Share To</h3>

            <div className="destinationGrid">
              {(["story", "feed", "profile", "world"] as Destination[]).map(
                (destination) => (
                  <button
                    key={destination}
                    className={
                      destinations[destination]
                        ? "destination activeDestination"
                        : "destination"
                    }
                    onClick={() => toggleDestination(destination)}
                  >
                    {destination === "story"
                      ? "📖 Story"
                      : destination === "feed"
                      ? "📱 Feed"
                      : destination === "profile"
                      ? "👤 Profile"
                      : "🌍 World"}
                  </button>
                )
              )}
            </div>
          </section>

          {destinations.world && (
            <section className="worldFields">
              <select
                className="field"
                value={worldType}
                onChange={(event) => setWorldType(event.target.value)}
              >
                <option>Feed</option>
                <option>Live</option>
                <option>Event</option>
                <option>Casting</option>
                <option>Build Together</option>
                <option>Music</option>
                <option>Podcast</option>
                <option>Business</option>
                <option>Sports</option>
                <option>Comedy</option>
              </select>

              <div className="twoColumns">
                <input
                  className="field"
                  placeholder="City"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />

                <input
                  className="field"
                  placeholder="State"
                  value={stateName}
                  onChange={(event) => setStateName(event.target.value)}
                />
              </div>
            </section>
          )}

          <button
            className="publishBtn"
            onClick={submitPost}
            disabled={
              posting ||
              !linkUrl.trim() ||
              selectedDestinations.length === 0
            }
          >
            {posting ? "Posting..." : "Share to UTV"}
          </button>

          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    );
  }

  if (mode === "camera") {
    return (
      <main className="cameraPage">
        <style>{styles}</style>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="cameraVideo"
          style={{
            transform:
              cameraFacing === "user" ? "scaleX(-1)" : "none",
          }}
        />

        <div className="cameraShade" />

        <button
          className="cameraTopBtn cameraBack"
          onClick={resetCreator}
        >
          ✕
        </button>

        <button
          className="cameraTopBtn cameraFlip"
          onClick={flipCamera}
        >
          🔄
        </button>

        <div className="cameraHeading">
          <strong>
            {destinations.story ? "Create Story" : "Create Post"}
          </strong>
        </div>

        <div className="cameraControls">
          <label className="cameraAction">
            <span>🖼️</span>
            <small>Gallery</small>

            <input
              hidden
              type="file"
              accept="image/*,video/*"
              onChange={pickFile}
            />
          </label>

          <button
            className="captureButton"
            onClick={capturePhoto}
            aria-label="Take photo"
          >
            <span />
          </button>

          <button
            className={
              recording
                ? "cameraAction recordingAction"
                : "cameraAction"
            }
            onClick={recording ? stopRecording : startRecording}
          >
            <span>{recording ? "⏹️" : "🎥"}</span>
            <small>{recording ? "Stop" : "Record"}</small>
          </button>
        </div>

        {message && <p className="cameraNotice">{message}</p>}
      </main>
    );
  }

  return (
    <main className="editorPage">
      <style>{styles}</style>

      <section className="editorStage">
        <header className="editorTop">
          <button
            className="editorIconBtn"
            onClick={() => {
              setFile(null);
              setPreview("");
              setMode("camera");

              setTimeout(() => {
                startCamera();
              }, 200);
            }}
          >
            ←
          </button>

          <strong>
            {destinations.story ? "Edit Story" : "Edit Post"}
          </strong>

          <button
            className="nextBtn"
            onClick={() =>
              document
                .getElementById("publish-panel")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Next
          </button>
        </header>

        <div
          className="mediaCanvas"
          onClick={() => {
            setSelectedTextId("");
            setSelectedStickerId("");
          }}
        >
          {previewIsVideo ? (
            <video
              className="editorMedia"
              src={previewUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          ) : previewIsImage ? (
            <img
              className="editorMedia"
              src={previewUrl}
              alt="UTV preview"
            />
          ) : (
            <div className="emptyPreview">
              <span>🎬</span>
              <p>Media preview</p>
            </div>
          )}

          {textLayers.map((layer) => (
            <div
              key={layer.id}
              className={
                selectedTextId === layer.id
                  ? "layerText selectedLayer"
                  : "layerText"
              }
              onPointerDown={(event) => {
                event.stopPropagation();
                beginTextDrag(event, layer);
              }}
              onPointerMove={moveText}
              onPointerUp={endTextDrag}
              onPointerCancel={endTextDrag}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                color: layer.color,
                fontSize: `${layer.size}px`,
                textShadow: layer.shadow
                  ? "0 3px 12px rgba(0,0,0,.95)"
                  : "none",
              }}
            >
              {layer.text}
            </div>
          ))}

          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className={
                selectedStickerId === sticker.id
                  ? "stickerLayer selectedLayer"
                  : "stickerLayer"
              }
              onPointerDown={(event) => {
                event.stopPropagation();
                beginStickerDrag(event, sticker);
              }}
              onPointerMove={moveSticker}
              onPointerUp={endStickerDrag}
              onPointerCancel={endStickerDrag}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                fontSize: `${sticker.size}px`,
              }}
            >
              {sticker.value}
            </div>
          ))}

          <canvas
            ref={drawingCanvasRef}
            className={
              drawingEnabled
                ? "drawingCanvas drawingActive"
                : "drawingCanvas"
            }
            onPointerDown={beginDrawing}
            onPointerMove={draw}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
          />

          {(musicFile || musicUrl.trim()) && (
            <div className="musicBadge">
              <span>🎵</span>
              <div>
                <strong>{musicTitle || "Story Music"}</strong>
                {musicArtist && <small>{musicArtist}</small>}
              </div>
            </div>
          )}
        </div>

        <section className="editorTools">
          <div className="mainTools">
            <button className="toolCircle" onClick={addTextLayer}>
              Aa
            </button>

            <button
              className="toolCircle"
              onClick={() => setShowMusicPanel((current) => !current)}
            >
              🎵
            </button>

            <button
              className={
                drawingEnabled
                  ? "toolCircle activeTool"
                  : "toolCircle"
              }
              onClick={() => setDrawingEnabled((current) => !current)}
            >
              ✏️
            </button>

            <button
              className="toolCircle"
              onClick={() => addSticker("🔥")}
            >
              😊
            </button>

            <button
              className="toolCircle"
              onClick={() => {
                deleteSelectedText();
                deleteSelectedSticker();
              }}
            >
              🗑️
            </button>
          </div>

          {selectedText && (
            <section className="layerControls">
              <input
                className="toolInput"
                value={selectedText.text}
                onChange={(event) =>
                  updateSelectedText({
                    text: event.target.value,
                  })
                }
              />

              <div className="colorRow">
                {textColors.map((color) => (
                  <button
                    key={color}
                    className={
                      selectedText.color === color
                        ? "colorDot selectedColor"
                        : "colorDot"
                    }
                    style={{ background: color }}
                    onClick={() =>
                      updateSelectedText({ color })
                    }
                  />
                ))}
              </div>

              <div className="controlRow">
                <button
                  className="miniTool"
                  onClick={() =>
                    updateSelectedText({
                      size: Math.max(16, selectedText.size - 4),
                    })
                  }
                >
                  A−
                </button>

                <span>{selectedText.size}px</span>

                <button
                  className="miniTool"
                  onClick={() =>
                    updateSelectedText({
                      size: Math.min(72, selectedText.size + 4),
                    })
                  }
                >
                  A+
                </button>

                <button
                  className="miniTool"
                  onClick={() =>
                    updateSelectedText({
                      shadow: !selectedText.shadow,
                    })
                  }
                >
                  ✨
                </button>
              </div>
            </section>
          )}

          {selectedSticker && (
            <section className="layerControls">
              <div className="controlRow">
                <button
                  className="miniTool"
                  onClick={() =>
                    updateSelectedSticker({
                      size: Math.max(
                        24,
                        selectedSticker.size - 6
                      ),
                    })
                  }
                >
                  −
                </button>

                <span>{selectedSticker.size}px</span>

                <button
                  className="miniTool"
                  onClick={() =>
                    updateSelectedSticker({
                      size: Math.min(
                        110,
                        selectedSticker.size + 6
                      ),
                    })
                  }
                >
                  +
                </button>
              </div>
            </section>
          )}

          <div className="stickerTray">
            {stickerChoices.map((sticker) => (
              <button
                key={sticker}
                onClick={() => addSticker(sticker)}
              >
                {sticker}
              </button>
            ))}
          </div>

          {drawingEnabled && (
            <section className="drawingTools">
              <div className="colorRow">
                {textColors.map((color) => (
                  <button
                    key={color}
                    className={
                      drawingColor === color
                        ? "colorDot selectedColor"
                        : "colorDot"
                    }
                    style={{ background: color }}
                    onClick={() => setDrawingColor(color)}
                  />
                ))}
              </div>

              <div className="controlRow">
                <button
                  className="miniTool"
                  onClick={() =>
                    setDrawingWidth((current) =>
                      Math.max(2, current - 1)
                    )
                  }
                >
                  Thin
                </button>

                <span>{drawingWidth}px</span>

                <button
                  className="miniTool"
                  onClick={() =>
                    setDrawingWidth((current) =>
                      Math.min(20, current + 1)
                    )
                  }
                >
                  Thick
                </button>

                <button className="miniTool" onClick={clearDrawing}>
                  Clear
                </button>
              </div>
            </section>
          )}

          {showMusicPanel && (
            <section className="musicPanel">
              <h3>Add Music</h3>

              <label className="musicUpload">
                <span>📁 Choose audio from phone</span>
                <small>MP3, M4A, WAV, AAC, or OGG</small>

                <input
                  hidden
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                  onChange={pickMusicFile}
                />
              </label>

              <input
                className="toolInput"
                placeholder="Or paste a direct audio URL"
                value={musicUrl}
                onChange={(event) => {
                  setMusicUrl(event.target.value);
                  setMusicFile(null);
                  setMusicPreview("");
                }}
              />

              <input
                className="toolInput"
                placeholder="Song title"
                value={musicTitle}
                onChange={(event) =>
                  setMusicTitle(event.target.value)
                }
              />

              <input
                className="toolInput"
                placeholder="Artist name"
                value={musicArtist}
                onChange={(event) =>
                  setMusicArtist(event.target.value)
                }
              />

              {(musicPreview || musicUrl.trim()) && (
                <audio
                  controls
                  src={musicPreview || musicUrl.trim()}
                  className="audioPreview"
                />
              )}

              {(musicFile || musicUrl.trim()) && (
                <button className="removeMusicBtn" onClick={removeMusic}>
                  Remove Music
                </button>
              )}
            </section>
          )}
        </section>
      </section>

      <section className="publishPanel" id="publish-panel">
        <div className="publishHandle" />

        <h2>Share Your Creation</h2>

        <input
          className="cleanField"
          placeholder="Title — optional"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <textarea
          className="cleanField captionField"
          placeholder="Caption — optional"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />

        <select
          className="cleanField"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categoryOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        {destinations.story && (
          <section className="durationPanel">
            <h3>Story Duration</h3>

            <div className="durationChoices">
              {[5, 10, 15].map((seconds) => (
                <button
                  key={seconds}
                  className={
                    storyDuration === seconds
                      ? "durationBtn activeDestination"
                      : "durationBtn"
                  }
                  onClick={() => setStoryDuration(seconds)}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="destinationPanel">
          <h3>Share To</h3>

          <div className="destinationGrid">
            {(["story", "feed", "profile", "world"] as Destination[]).map(
              (destination) => (
                <button
                  key={destination}
                  className={
                    destinations[destination]
                      ? "destination activeDestination"
                      : "destination"
                  }
                  onClick={() => toggleDestination(destination)}
                >
                  {destination === "story"
                    ? "📖 Story"
                    : destination === "feed"
                    ? "📱 Feed"
                    : destination === "profile"
                    ? "👤 Profile"
                    : "🌍 World"}
                </button>
              )
            )}
          </div>
        </section>

        {destinations.world && (
          <section className="worldFields">
            <select
              className="cleanField"
              value={worldType}
              onChange={(event) =>
                setWorldType(event.target.value)
              }
            >
              <option>Feed</option>
              <option>Live</option>
              <option>Event</option>
              <option>Casting</option>
              <option>Build Together</option>
              <option>Music</option>
              <option>Podcast</option>
              <option>Business</option>
              <option>Sports</option>
              <option>Comedy</option>
            </select>

            <div className="twoColumns">
              <input
                className="cleanField"
                placeholder="City"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />

              <input
                className="cleanField"
                placeholder="State"
                value={stateName}
                onChange={(event) => setStateName(event.target.value)}
              />
            </div>
          </section>
        )}

        <p className="destinationSummary">
          Sharing to:{" "}
          {selectedDestinations.length
            ? selectedDestinations.join(", ")
            : "Choose at least one destination"}
        </p>

        <button
          className="publishBtn"
          onClick={submitPost}
          disabled={
            posting ||
            selectedDestinations.length === 0 ||
            (!file && !linkUrl.trim())
          }
        >
          {posting ? "Posting to UTV..." : "Share to UTV"}
        </button>

        <button className="cancelBtn" onClick={resetCreator}>
          Cancel
        </button>

        {message && <p className="notice">{message}</p>}
      </section>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: .55;
  }

  .submitPage {
    min-height: 100vh;
    padding-bottom: 120px;
    color: white;
    background:
      radial-gradient(circle at 10% 0%, rgba(82,247,200,.17), transparent 30%),
      radial-gradient(circle at 90% 7%, rgba(123,97,255,.24), transparent 35%),
      linear-gradient(180deg, #07111e, #000);
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #52f7c8;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .createHero {
    margin: 16px;
    padding: 24px;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 28px;
    background: rgba(255,255,255,.07);
    backdrop-filter: blur(20px);
  }

  .createHero h1,
  .linkShell h1 {
    margin: 0;
    font-size: 40px;
    letter-spacing: -1.5px;
  }

  .createHero p,
  .muted {
    color: rgba(255,255,255,.65);
    line-height: 1.5;
  }

  .createGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 0 16px 20px;
  }

  .createCard {
    min-height: 158px;
    padding: 16px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 24px;
    background: rgba(255,255,255,.065);
    backdrop-filter: blur(16px);
  }

  .createCard:active {
    transform: scale(.98);
  }

  .createIcon {
    font-size: 34px;
  }

  .createCard h3 {
    margin: 12px 0 5px;
    font-size: 17px;
  }

  .createCard p {
    margin: 0;
    color: rgba(255,255,255,.58);
    font-size: 13px;
    line-height: 1.4;
  }

  .linkShell {
    display: grid;
    gap: 13px;
    max-width: 680px;
    margin: 0 auto;
    padding: 22px 16px 120px;
  }

  .field,
  .cleanField,
  .toolInput {
    width: 100%;
    padding: 15px 16px;
    color: white;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 18px;
    outline: none;
    background: rgba(255,255,255,.08);
  }

  .field option,
  .cleanField option {
    color: black;
  }

  .captionField {
    min-height: 105px;
    resize: vertical;
  }

  .glassBtn,
  .editorIconBtn,
  .nextBtn,
  .toolCircle {
    color: white;
    border: 1px solid rgba(255,255,255,.18);
    background: rgba(0,0,0,.48);
    backdrop-filter: blur(14px);
  }

  .backButton {
    width: max-content;
    padding: 10px 14px;
    border-radius: 999px;
  }

  .cameraPage {
    position: fixed;
    inset: 0;
    z-index: 500;
    overflow: hidden;
    background: #000;
  }

  .cameraVideo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cameraShade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(0,0,0,.48),
      transparent 22%,
      transparent 68%,
      rgba(0,0,0,.65)
    );
  }

  .cameraTopBtn {
    position: absolute;
    top: max(18px, env(safe-area-inset-top));
    z-index: 3;
    width: 48px;
    height: 48px;
    color: white;
    border: 1px solid rgba(255,255,255,.25);
    border-radius: 50%;
    background: rgba(0,0,0,.5);
    backdrop-filter: blur(15px);
  }

  .cameraBack {
    left: 18px;
  }

  .cameraFlip {
    right: 18px;
  }

  .cameraHeading {
    position: absolute;
    top: max(31px, env(safe-area-inset-top));
    left: 50%;
    z-index: 3;
    transform: translateX(-50%);
  }

  .cameraControls {
    position: absolute;
    right: 22px;
    bottom: max(32px, env(safe-area-inset-bottom));
    left: 22px;
    z-index: 4;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 22px;
  }

  .cameraAction {
    min-height: 66px;
    display: grid;
    place-items: center;
    gap: 3px;
    color: white;
    border: 0;
    background: transparent;
    font-weight: 850;
  }

  .cameraAction span {
    font-size: 28px;
  }

  .cameraAction small {
    font-size: 11px;
  }

  .captureButton {
    width: 86px;
    height: 86px;
    padding: 7px;
    border: 4px solid white;
    border-radius: 50%;
    background: transparent;
  }

  .captureButton span {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 50%;
    background: white;
  }

  .recordingAction {
    color: #ff5f57;
    animation: recordingPulse 1s infinite;
  }

  @keyframes recordingPulse {
    50% {
      transform: scale(1.08);
    }
  }

  .cameraNotice {
    position: absolute;
    right: 20px;
    bottom: 140px;
    left: 20px;
    z-index: 5;
    padding: 12px;
    text-align: center;
    border-radius: 16px;
    background: rgba(0,0,0,.65);
  }

  .editorPage {
    min-height: 100vh;
    padding-bottom: 70px;
    color: white;
    background: #000;
  }

  .editorStage {
    min-height: 100vh;
  }

  .editorTop {
    position: sticky;
    top: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: 52px 1fr 70px;
    align-items: center;
    gap: 10px;
    padding: max(14px, env(safe-area-inset-top)) 14px 12px;
    background: rgba(0,0,0,.82);
    backdrop-filter: blur(18px);
  }

  .editorTop strong {
    text-align: center;
  }

  .editorIconBtn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }

  .nextBtn {
    padding: 10px 13px;
    color: #52f7c8;
    border-radius: 999px;
    font-weight: 950;
  }

  .mediaCanvas {
    position: relative;
    width: 100%;
    height: calc(100vh - 175px);
    min-height: 480px;
    overflow: hidden;
    touch-action: none;
    background: #090909;
  }

  .editorMedia {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    background: #000;
  }

  .emptyPreview {
    height: 100%;
    display: grid;
    place-content: center;
    text-align: center;
    color: rgba(255,255,255,.55);
  }

  .emptyPreview span {
    font-size: 58px;
  }

  .layerText,
  .stickerLayer {
    position: absolute;
    z-index: 15;
    transform: translate(-50%, -50%);
    cursor: grab;
    user-select: none;
    touch-action: none;
  }

  .layerText {
    max-width: 88%;
    padding: 7px 11px;
    font-weight: 950;
    text-align: center;
    white-space: pre-wrap;
  }

  .selectedLayer {
    outline: 2px dashed rgba(82,247,200,.9);
    outline-offset: 5px;
  }

  .drawingCanvas {
    position: absolute;
    inset: 0;
    z-index: 12;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .drawingActive {
    pointer-events: auto;
    touch-action: none;
  }

  .musicBadge {
    position: absolute;
    left: 16px;
    bottom: 16px;
    z-index: 18;
    display: flex;
    align-items: center;
    gap: 9px;
    max-width: 72%;
    padding: 9px 12px;
    border-radius: 999px;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(15px);
  }

  .musicBadge div {
    display: grid;
  }

  .musicBadge small {
    color: rgba(255,255,255,.65);
  }

  .editorTools {
    padding: 14px 14px 20px;
    background: linear-gradient(180deg, #050505, #111);
  }

  .mainTools,
  .toolRow {
    display: flex;
    justify-content: center;
    gap: 12px;
    overflow-x: auto;
  }

  .toolCircle {
    flex: 0 0 auto;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    font-weight: 950;
  }

  .activeTool {
    border-color: #52f7c8;
    box-shadow: 0 0 18px rgba(82,247,200,.35);
  }

  .layerControls,
  .drawingTools,
  .musicPanel {
    display: grid;
    gap: 12px;
    margin-top: 15px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 20px;
    background: rgba(255,255,255,.055);
  }

  .colorRow {
    display: flex;
    justify-content: center;
    gap: 12px;
    overflow-x: auto;
  }

  .colorDot {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border: 2px solid rgba(255,255,255,.7);
    border-radius: 50%;
  }

  .selectedColor {
    outline: 3px solid #52f7c8;
    outline-offset: 3px;
  }

  .controlRow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .miniTool {
    padding: 9px 12px;
    color: white;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 999px;
    background: rgba(255,255,255,.08);
    font-weight: 850;
  }

  .stickerTray {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    overflow-x: auto;
  }

  .stickerTray button {
    flex: 0 0 auto;
    width: 46px;
    height: 46px;
    font-size: 25px;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 50%;
    background: rgba(255,255,255,.07);
  }

  .musicUpload {
    display: grid;
    gap: 4px;
    padding: 15px;
    text-align: center;
    border: 1px dashed rgba(82,247,200,.6);
    border-radius: 18px;
    background: rgba(82,247,200,.06);
    cursor: pointer;
  }

  .musicUpload small {
    color: rgba(255,255,255,.55);
  }

  .audioPreview {
    width: 100%;
  }

  .removeMusicBtn {
    padding: 12px;
    color: white;
    border: 1px solid rgba(255,95,87,.45);
    border-radius: 16px;
    background: rgba(255,95,87,.14);
    font-weight: 900;
  }

  .publishPanel {
    display: grid;
    gap: 13px;
    max-width: 720px;
    margin: 0 auto;
    padding: 18px 16px 120px;
    border-radius: 30px 30px 0 0;
    background:
      radial-gradient(circle at top, rgba(82,247,200,.1), transparent 25%),
      linear-gradient(180deg, #101826, #020304);
  }

  .publishHandle {
    width: 44px;
    height: 5px;
    margin: 0 auto 4px;
    border-radius: 999px;
    background: rgba(255,255,255,.3);
  }

  .publishPanel h2 {
    margin: 4px 0 2px;
    font-size: 28px;
  }

  .destinationPanel,
  .durationPanel {
    padding: 15px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 22px;
    background: rgba(255,255,255,.055);
  }

  .destinationPanel h3,
  .durationPanel h3 {
    margin: 0 0 12px;
  }

  .destinationGrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
  }

  .destination,
  .durationBtn {
    padding: 13px 10px;
    color: rgba(255,255,255,.72);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 16px;
    background: rgba(0,0,0,.25);
    font-weight: 850;
  }

  .activeDestination {
    color: #06120d;
    border-color: transparent;
    background: linear-gradient(135deg, #52f7c8, #7b61ff);
  }

  .durationChoices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
  }

  .worldFields {
    display: grid;
    gap: 11px;
  }

  .twoColumns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .destinationSummary {
    margin: 0;
    color: rgba(255,255,255,.58);
    font-size: 13px;
    text-transform: capitalize;
  }

  .publishBtn,
  .cancelBtn {
    width: 100%;
    padding: 16px;
    border: 0;
    border-radius: 19px;
    font-weight: 950;
    font-size: 16px;
  }

  .publishBtn {
    color: #06120d;
    background: linear-gradient(135deg, #52f7c8, #7b61ff);
  }

  .cancelBtn {
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.07);
  }

  .notice {
    margin: 0;
    padding: 13px;
    color: #52f7c8;
    text-align: center;
    border-radius: 16px;
    background: rgba(82,247,200,.08);
    font-weight: 850;
  }

  @media (min-width: 800px) {
    .createGrid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      max-width: 1150px;
      margin: 0 auto;
    }

    .createHero {
      max-width: 1118px;
      margin-right: auto;
      margin-left: auto;
    }

    .mediaCanvas {
      max-width: 620px;
      height: 760px;
      min-height: 0;
      margin: 0 auto;
      border-right: 1px solid rgba(255,255,255,.1);
      border-left: 1px solid rgba(255,255,255,.1);
    }

    .editorTools {
      max-width: 620px;
      margin: 0 auto;
    }
  }
`;