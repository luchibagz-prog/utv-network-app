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

type Destination = "feed" | "profile" | "world";
type CameraFacing = "user" | "environment";
type CreatorMode = "hub" | "camera" | "editor" | "link";

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
    title: "Story",
    icon: "📖",
    desc: "Share a photo or video for 24 hours.",
    type: "story",
  },
  {
    title: "Feed Post",
    icon: "📱",
    desc: "Post a photo, video, or update.",
    type: "feed",
  },
  {
    title: "Paste Link",
    icon: "🔗",
    desc: "Share a hosted video, image, or flyer.",
    type: "link",
  },
  {
    title: "TV Show",
    icon: "🎬",
    desc: "Upload a show or episode.",
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
    desc: "Share music and visuals.",
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
  const value = url.toLowerCase();

  return (
    value.includes("youtube.com") ||
    value.includes("youtu.be") ||
    value.includes("vimeo.com") ||
    value.includes("tiktok.com") ||
    value.includes("instagram.com")
  );
}

export default function SubmitPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

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

  const [mode, setMode] = useState<CreatorMode>("hub");
  const [creationType, setCreationType] = useState("feed");

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

  const [destinations, setDestinations] = useState<
    Record<Destination, boolean>
  >({
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

  const isStory = creationType === "story";

  const selectedText = textLayers.find(
    (layer) => layer.id === selectedTextId
  );

  const selectedSticker = stickers.find(
    (sticker) => sticker.id === selectedStickerId
  );

  const selectedDestinations = useMemo(() => {
    return Object.entries(destinations)
      .filter(([, selected]) => selected)
      .map(([destination]) => destination);
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

  useEffect(() => {
    if (mode !== "editor") return;

    const timer = window.setTimeout(() => {
      resizeDrawingCanvas();
    }, 100);

    window.addEventListener("resize", resizeDrawingCanvas);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", resizeDrawingCanvas);
    };
  }, [mode]);

  function resetCreator() {
    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    if (musicPreview.startsWith("blob:")) {
      URL.revokeObjectURL(musicPreview);
    }

    stopCamera();

    setMode("hub");
    setCreationType("feed");

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

    setDestinations({
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

    setCreationType(type);
    setCategory(categoryMap[type] || "Feed");

    if (type === "story") {
      setDestinations({
        feed: false,
        profile: false,
        world: false,
      });
    } else {
      setDestinations({
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

    window.setTimeout(() => {
      startCamera();
    }, 150);
  }

  async function startCamera(
    facing: CameraFacing = cameraFacing
  ) {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: facing,
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1080,
          },
          aspectRatio: {
            ideal: 16 / 9,
          },
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;

        await videoRef.current.play();
      }

      setCameraFacing(facing);
      setMessage("");
    } catch (error) {
      console.error(error);

      setMessage(
        "Allow camera and microphone permissions, then try again."
      );
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
    const nextFacing =
      cameraFacing === "user" ? "environment" : "user";

    await startCamera(nextFacing);
  }

  function pickFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setLinkUrl("");

    stopCamera();
    setMode("editor");
    setMessage("");
  }

  function pickMusicFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("audio/")) {
      setMessage("Choose an audio file from your phone.");
      return;
    }

    if (musicPreview.startsWith("blob:")) {
      URL.revokeObjectURL(musicPreview);
    }

    setMusicFile(selectedFile);
    setMusicPreview(URL.createObjectURL(selectedFile));
    setMusicUrl("");

    if (!musicTitle) {
      setMusicTitle(
        selectedFile.name.replace(/\.[^/.]+$/, "")
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
        setMode("editor");
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
      setMode("editor");
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
    const text = window.prompt(
      isStory ? "Type your story text" : "Type your post text"
    );

    if (!text?.trim()) return;

    const layer: TextLayer = {
      id: makeId("text"),
      text: text.trim(),
      color: "#ffffff",
      size: 32,
      x: 50,
      y: 40,
      shadow: true,
    };

    setTextLayers((current) => [...current, layer]);
    setSelectedTextId(layer.id);
    setSelectedStickerId("");
  }

  function updateSelectedText(changes: Partial<TextLayer>) {
    if (!selectedTextId) return;

    setTextLayers((current) =>
      current.map((layer) =>
        layer.id === selectedTextId
          ? {
              ...layer,
              ...changes,
            }
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
    setSelectedTextId("");
  }

  function updateSelectedSticker(
    changes: Partial<StickerLayer>
  ) {
    if (!selectedStickerId) return;

    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === selectedStickerId
          ? {
              ...sticker,
              ...changes,
            }
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
    event: React.PointerEvent<HTMLDivElement>,
    layer: TextLayer
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);

    draggingTextRef.current = {
      id: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: layer.x,
      originalY: layer.y,
    };

    setSelectedTextId(layer.id);
    setSelectedStickerId("");
  }

  function moveText(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    const drag = draggingTextRef.current;

    if (!drag) return;

    const bounds =
      event.currentTarget.parentElement?.getBoundingClientRect();

    if (!bounds) return;

    const moveX =
      ((event.clientX - drag.startX) / bounds.width) * 100;

    const moveY =
      ((event.clientY - drag.startY) / bounds.height) * 100;

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

  function endTextDrag(
    event?: React.PointerEvent<HTMLDivElement>
  ) {
    if (
      event &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    draggingTextRef.current = null;
  }

  function beginStickerDrag(
    event: React.PointerEvent<HTMLDivElement>,
    sticker: StickerLayer
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);

    draggingStickerRef.current = {
      id: sticker.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: sticker.x,
      originalY: sticker.y,
    };

    setSelectedStickerId(sticker.id);
    setSelectedTextId("");
  }

  function moveSticker(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    const drag = draggingStickerRef.current;

    if (!drag) return;

    const bounds =
      event.currentTarget.parentElement?.getBoundingClientRect();

    if (!bounds) return;

    const moveX =
      ((event.clientX - drag.startX) / bounds.width) * 100;

    const moveY =
      ((event.clientY - drag.startY) / bounds.height) * 100;

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

  function endStickerDrag(
    event?: React.PointerEvent<HTMLDivElement>
  ) {
    if (
      event &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    draggingStickerRef.current = null;
  }

  function resizeDrawingCanvas() {
    const canvas = drawingCanvasRef.current;

    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    const nextWidth = Math.max(
      1,
      Math.round(bounds.width * ratio)
    );

    const nextHeight = Math.max(
      1,
      Math.round(bounds.height * ratio)
    );

    if (
      canvas.width === nextWidth &&
      canvas.height === nextHeight
    ) {
      return;
    }

    const oldDrawing =
      canvas.width > 1 && canvas.height > 1
        ? canvas.toDataURL("image/png")
        : "";

    canvas.width = nextWidth;
    canvas.height = nextHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";

    if (oldDrawing) {
      const image = new Image();

      image.onload = () => {
        context.drawImage(
          image,
          0,
          0,
          bounds.width,
          bounds.height
        );
      };

      image.src = oldDrawing;
    }
  }

  function beginDrawing(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawingEnabled) return;

    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const bounds = canvas.getBoundingClientRect();

    context.beginPath();
    context.moveTo(
      event.clientX - bounds.left,
      event.clientY - bounds.top
    );

    drawingRef.current = true;
  }

  function draw(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawingEnabled || !drawingRef.current) return;

    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const bounds = canvas.getBoundingClientRect();

    context.strokeStyle = drawingColor;
    context.lineWidth = drawingWidth;

    context.lineTo(
      event.clientX - bounds.left,
      event.clientY - bounds.top
    );

    context.stroke();
  }

  function endDrawing(
    event?: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (
      event &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    drawingRef.current = false;
  }

  function clearDrawing() {
    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
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
        cacheControl: "3600",
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
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

  async function shareStory() {
    if (!file && !linkUrl.trim()) {
      setMessage("Choose a photo or video first.");
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

      const media = await uploadMedia();
      const finalMusicUrl = await uploadMusic();

      const { data: storyRow, error: storyError } =
        await supabase
          .from("stories")
          .insert({
            user_email: user.email,
            media_url: media.mediaUrl,
            media_type:
              media.mediaType === "image"
                ? "image"
                : "video",
            caption: caption.trim(),
            music_url: finalMusicUrl || null,
            music_title:
              [musicTitle.trim(), musicArtist.trim()]
                .filter(Boolean)
                .join(" — ") || null,
            text_overlay: textLayers,
            stickers,
            drawing_data: drawingDataUrl() || null,
            duration_seconds: 10,
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .select("id")
          .single();

      if (storyError) {
        throw storyError;
      }

      setMessage("Story shared.");

      window.setTimeout(() => {
        if (storyRow?.id) {
          router.push(`/stories/${storyRow.id}`);
        } else {
          router.push("/feed");
        }
      }, 350);
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Could not share your story."
      );
    } finally {
      setPosting(false);
    }
  }

  async function shareRegularPost() {
    if (!file && !linkUrl.trim()) {
      setMessage("Choose a photo, video, or link first.");
      return;
    }

    if (!selectedDestinations.length) {
      setMessage("Choose where you want to share.");
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

      const media = await uploadMedia();

      const isVideo =
        media.mediaType === "video" ||
        media.mediaType === "embed" ||
        media.mediaType === "link";

      const premiumCategories = [
        "Show",
        "Movie",
        "Podcast",
        "Live Event",
      ];

      const needsApproval =
        premiumCategories.includes(category);

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
              description: caption.trim(),
              category,
              creator_email: user.email,
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

        if (uploadError) {
          throw uploadError;
        }

        uploadId = uploadRow?.id || "";
      }

      if (destinations.world) {
        const { error: worldError } = await supabase
          .from("world_posts")
          .insert({
            creator_email: user.email,
            title: title.trim() || "UTV World Post",
            description: caption.trim(),
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

        if (worldError) {
          throw worldError;
        }
      }

      setMessage(
        needsApproval
          ? "Submitted for approval."
          : "Posted successfully."
      );

      window.setTimeout(() => {
        if (
          destinations.world &&
          !destinations.feed &&
          !destinations.profile
        ) {
          router.push("/world");
          return;
        }

        if (
          destinations.profile &&
          !destinations.feed
        ) {
          router.push("/profile");
          return;
        }

        if (uploadId) {
          router.push("/feed");
          return;
        }

        router.push("/feed");
      }, 450);
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Could not post to UTV."
      );
    } finally {
      setPosting(false);
    }
  }

  async function submitCreation() {
    if (isStory) {
      await shareStory();
      return;
    }

    await shareRegularPost();
  }
 if (mode === "hub") {
  return (
    <main className="submitPage">
      <UTVNav />
      <style>{styles}</style>

      <section className="createHero">
        <img
          src="/utv-logo.png"
          alt="UTV"
          className="createLogo"
        />

        <div>
          <p>UTV CREATOR</p>
          <h1>Create Something</h1>
          <span>
            Post a story, upload content, or go live.
          </span>
        </div>
      </section>

      <section className="mainCreateGrid">
        <button
          className="mainCreateCard storyCreateCard"
          onClick={() => startCreate("story")}
        >
          <span>📖</span>
          <div>
            <h2>Story</h2>
            <p>Share a photo or video for 24 hours.</p>
          </div>
        </button>

        <button
          className="mainCreateCard feedCreateCard"
          onClick={() => startCreate("feed")}
        >
          <span>📱</span>
          <div>
            <h2>Feed Post</h2>
            <p>Post photos, videos, and updates.</p>
          </div>
        </button>

        <button
          className="mainCreateCard liveCreateCard"
          onClick={() => router.push("/live-room")}
        >
          <span>🔴</span>
          <div>
            <h2>Go Live</h2>
            <p>Broadcast and connect in real time.</p>
          </div>
        </button>
      </section>

      <section className="moreCreateSection">
        <div className="sectionHeading">
          <h2>More Ways to Create</h2>
          <span>Build your audience on UTV</span>
        </div>

        <div className="moreCreateGrid">
          {createOptions
            .filter(
              (option) =>
                option.title !== "Story" &&
                option.title !== "Feed Post" &&
                option.title !== "Go Live"
            )
            .map((option) => (
              <button
                key={option.title}
                className="smallCreateCard"
                onClick={() => {
                  if (option.route) {
                    router.push(option.route);
                    return;
                  }

                  startCreate(option.type || "feed");
                }}
              >
                <span>{option.icon}</span>
                <h3>{option.title}</h3>
                <p>{option.desc}</p>
              </button>
            ))}
        </div>
      </section>
    </main>
  );
}

  if (mode === "link") {
    return (
      <main className="submitPage">
        <UTVNav />
        <style>{styles}</style>

        <section className="linkPanel">
          <button
            className="backPill"
            onClick={resetCreator}
          >
            ← Back
          </button>

          <p className="eyebrow">
            SHARE A LINK
          </p>

          <h1>Post to UTV</h1>

          <input
            className="formField"
            placeholder="Paste video, image, or hosted media link"
            value={linkUrl}
            onChange={(event) =>
              setLinkUrl(event.target.value)
            }
          />

          <input
            className="formField"
            placeholder="Cover image URL — optional"
            value={coverUrl}
            onChange={(event) =>
              setCoverUrl(event.target.value)
            }
          />

          <input
            className="formField"
            placeholder="Title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
          />

          <textarea
            className="formField captionField"
            placeholder="Caption"
            value={caption}
            onChange={(event) =>
              setCaption(event.target.value)
            }
          />

          <select
            className="formField"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
          >
            {categoryOptions.map((option) => (
              <option key={option}>
                {option}
              </option>
            ))}
          </select>

          <section className="destinationPanel">
            <h3>Share To</h3>

            <div className="destinationGrid">
              {(
                [
                  "feed",
                  "profile",
                  "world",
                ] as Destination[]
              ).map((destination) => (
                <button
                  key={destination}
                  className={
                    destinations[destination]
                      ? "destinationButton activeDestination"
                      : "destinationButton"
                  }
                  onClick={() =>
                    toggleDestination(destination)
                  }
                >
                  {destination === "feed"
                    ? "📱 Feed"
                    : destination === "profile"
                    ? "👤 Profile"
                    : "🌍 World"}
                </button>
              ))}
            </div>
          </section>

          {destinations.world && (
            <section className="worldFields">
              <select
                className="formField"
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

              <div className="twoFields">
                <input
                  className="formField"
                  placeholder="City"
                  value={city}
                  onChange={(event) =>
                    setCity(event.target.value)
                  }
                />

                <input
                  className="formField"
                  placeholder="State"
                  value={stateName}
                  onChange={(event) =>
                    setStateName(event.target.value)
                  }
                />
              </div>
            </section>
          )}

          <button
            className="shareButton"
            disabled={
              posting ||
              !linkUrl.trim() ||
              selectedDestinations.length === 0
            }
            onClick={submitCreation}
          >
            {posting
              ? "Posting..."
              : "Post to UTV"}
          </button>

          {message && (
            <p className="submitMessage">
              {message}
            </p>
          )}
        </section>
      </main>
    );
  }

  if (mode === "camera") {
    return (
      <main className="utvCameraPage">
        <style>{styles}</style>

        <header className="cameraHeader">
          <button
            className="cameraHeaderButton"
            onClick={resetCreator}
            aria-label="Close camera"
          >
            ✕
          </button>

          <div className="cameraBrand">
            <strong>UTV</strong>

            <span>
              {isStory
                ? "STORY"
                : "CREATE"}
            </span>
          </div>

          <button
            className="cameraHeaderButton flipButton"
            onClick={flipCamera}
            aria-label="Flip camera"
          >
            <span>⟳</span>
            <small>Flip</small>
          </button>
        </header>

        <section className="cameraViewport">
         <video
  ref={videoRef}
  autoPlay
  muted
  playsInline
  disablePictureInPicture
  controls={false}
  className="cameraPreview"
  style={{
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    objectFit: "cover",
    background: "#000",
  }}
/>
<div className="cameraOverlay">
  <div className="cameraTopBar">
    <button
      className="cameraCircleButton"
      onClick={resetCreator}
      aria-label="Close camera"
    >
      ✕
    </button>

    <div className="cameraLogo">
      <strong>U TV</strong>
      <span>{isStory ? "STORY" : "CREATE"}</span>
    </div>

    <button
      className="cameraCircleButton"
      onClick={flipCamera}
      aria-label="Flip camera"
    >
      ⟳
    </button>
  </div>

  <div className="cameraBottomBar">
    <label className="cameraSideControl">
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
      className={
        recording
          ? "cameraCaptureButton recording"
          : "cameraCaptureButton"
      }
      onClick={recording ? stopRecording : capturePhoto}
      aria-label={recording ? "Stop recording" : "Take photo"}
    >
      <span />
    </button>

    <button
      className="cameraSideControl"
      onClick={recording ? stopRecording : startRecording}
    >
      <span>{recording ? "⏹️" : "🎥"}</span>
      <small>{recording ? "Stop" : "Video"}</small>
    </button>
  </div>

  <div className="cameraQuickModes">
    <button onClick={() => setCreationType("story")}>Story</button>
    <button onClick={() => setCreationType("feed")}>Post</button>
    <button onClick={() => router.push("/live-room")}>Live</button>
  </div>

  {message && <div className="cameraError">{message}</div>}
</div>

          <div className="cameraShade" />

          {message && (
            <div className="cameraMessage">
              {message}
            </div>
          )}
        </section>

        <section className="cameraControls">
          <div className="cameraModeRow">
            <label className="cameraModeButton">
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
              className="cameraModeButton"
              onClick={capturePhoto}
            >
              <span>📷</span>
              <small>Photo</small>
            </button>

            <button
              className={
                recording
                  ? "mainCaptureButton recordingCapture"
                  : "mainCaptureButton"
              }
              onClick={
                recording
                  ? stopRecording
                  : capturePhoto
              }
              aria-label={
                recording
                  ? "Stop recording"
                  : "Take photo"
              }
            >
              <span />
            </button>

            <button
              className="cameraModeButton"
              onClick={
                recording
                  ? stopRecording
                  : startRecording
              }
            >
              <span>
                {recording
                  ? "⏹️"
                  : "🎥"}
              </span>

              <small>
                {recording
                  ? "Stop"
                  : "Video"}
              </small>
            </button>

            <button
              className="cameraModeButton"
              onClick={() =>
                router.push("/live-room")
              }
            >
              <span>🔴</span>
              <small>Live</small>
            </button>
          </div>

          <p className="cameraHelp">
            Tap the center button for a photo • Tap Video to record
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="editorPage">
      <style>{styles}</style>

      <header className="editorHeader">
        <button
          className="circleButton"
          onClick={() => {
            setFile(null);
            setPreview("");
            setMode("camera");

            window.setTimeout(() => {
              startCamera();
            }, 150);
          }}
        >
          ←
        </button>

        <strong>
          {isStory
            ? "Edit Story"
            : "Edit Post"}
        </strong>

        <button
          className="shareTopButton"
          disabled={posting}
          onClick={submitCreation}
        >
          {posting
            ? "..."
            : isStory
            ? "Share"
            : "Next"}
        </button>
      </header>

      <section className="editorCanvas">
        {previewIsVideo ? (
          <video
            src={previewUrl}
            className="editorMedia"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        ) : previewIsImage ? (
          <img
            src={previewUrl}
            className="editorMedia"
            alt="UTV preview"
          />
        ) : (
          <div className="emptyPreview">
            Select a photo or video
          </div>
        )}

        {textLayers.map((layer) => (
          <div
            key={layer.id}
            className={
              selectedTextId === layer.id
                ? "textLayer selectedLayer"
                : "textLayer"
            }
            onPointerDown={(event) =>
              beginTextDrag(event, layer)
            }
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
            onPointerDown={(event) =>
              beginStickerDrag(
                event,
                sticker
              )
            }
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
              ? "drawingCanvas activeDrawing"
              : "drawingCanvas"
          }
          onPointerDown={beginDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerCancel={endDrawing}
        />

        {(musicFile ||
          musicUrl.trim()) && (
          <div className="musicBadge">
            <span>🎵</span>

            <div>
              <strong>
                {musicTitle ||
                  "Story Music"}
              </strong>

              {musicArtist && (
                <small>
                  {musicArtist}
                </small>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="editorToolbar">
        <button
          className="toolButton"
          onClick={addTextLayer}
        >
          <strong>Aa</strong>
          <small>Text</small>
        </button>

        <button
          className="toolButton"
          onClick={() =>
            setShowMusicPanel(
              (current) => !current
            )
          }
        >
          <span>🎵</span>
          <small>Music</small>
        </button>

        <button
          className={
            drawingEnabled
              ? "toolButton activeTool"
              : "toolButton"
          }
          onClick={() =>
            setDrawingEnabled(
              (current) => !current
            )
          }
        >
          <span>✏️</span>
          <small>Draw</small>
        </button>

        <button
          className="toolButton"
          onClick={() =>
            addSticker("🔥")
          }
        >
          <span>😊</span>
          <small>Sticker</small>
        </button>

        <button
          className="toolButton"
          onClick={() => {
            deleteSelectedText();
            deleteSelectedSticker();
          }}
        >
          <span>🗑️</span>
          <small>Delete</small>
        </button>
      </section>

      <section className="editorOptions">
        {selectedText && (
          <div className="optionPanel">
            <input
              className="formField"
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
                  style={{
                    background: color,
                  }}
                  onClick={() =>
                    updateSelectedText({
                      color,
                    })
                  }
                />
              ))}
            </div>

            <div className="sizeRow">
              <button
                onClick={() =>
                  updateSelectedText({
                    size: Math.max(
                      16,
                      selectedText.size - 4
                    ),
                  })
                }
              >
                A−
              </button>

              <span>
                {selectedText.size}px
              </span>

              <button
                onClick={() =>
                  updateSelectedText({
                    size: Math.min(
                      72,
                      selectedText.size + 4
                    ),
                  })
                }
              >
                A+
              </button>
            </div>
          </div>
        )}

        {selectedSticker && (
          <div className="optionPanel">
            <div className="sizeRow">
              <button
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

              <span>
                {selectedSticker.size}px
              </span>

              <button
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
          </div>
        )}

        <div className="stickerTray">
          {stickerChoices.map((sticker) => (
            <button
              key={sticker}
              onClick={() =>
                addSticker(sticker)
              }
            >
              {sticker}
            </button>
          ))}
        </div>

        {drawingEnabled && (
          <div className="optionPanel">
            <div className="colorRow">
              {textColors.map((color) => (
                <button
                  key={color}
                  className={
                    drawingColor === color
                      ? "colorDot selectedColor"
                      : "colorDot"
                  }
                  style={{
                    background: color,
                  }}
                  onClick={() =>
                    setDrawingColor(color)
                  }
                />
              ))}
            </div>

            <div className="sizeRow">
              <button
                onClick={() =>
                  setDrawingWidth(
                    (current) =>
                      Math.max(
                        2,
                        current - 1
                      )
                  )
                }
              >
                Thin
              </button>

              <span>
                {drawingWidth}px
              </span>

              <button
                onClick={() =>
                  setDrawingWidth(
                    (current) =>
                      Math.min(
                        20,
                        current + 1
                      )
                  )
                }
              >
                Thick
              </button>

              <button
                onClick={clearDrawing}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {showMusicPanel && (
          <div className="musicPanel">
            <label className="musicUpload">
              <span>
                📁 Choose music from phone
              </span>

              <small>
                MP3, M4A, WAV, AAC, or OGG
              </small>

              <input
                hidden
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                onChange={pickMusicFile}
              />
            </label>

            <input
              className="formField"
              placeholder="Song title"
              value={musicTitle}
              onChange={(event) =>
                setMusicTitle(
                  event.target.value
                )
              }
            />

            <input
              className="formField"
              placeholder="Artist"
              value={musicArtist}
              onChange={(event) =>
                setMusicArtist(
                  event.target.value
                )
              }
            />

            <input
              className="formField"
              placeholder="Or paste direct audio URL"
              value={musicUrl}
              onChange={(event) => {
                setMusicUrl(
                  event.target.value
                );

                setMusicFile(null);
                setMusicPreview("");
              }}
            />

            {(musicPreview ||
              musicUrl.trim()) && (
              <audio
                controls
                className="audioPreview"
                src={
                  musicPreview ||
                  musicUrl.trim()
                }
              />
            )}

            {(musicFile ||
              musicUrl.trim()) && (
              <button
                className="removeMusicButton"
                onClick={removeMusic}
              >
                Remove Music
              </button>
            )}
          </div>
        )}

        <textarea
          className="formField captionField"
          placeholder={
            isStory
              ? "Add a caption..."
              : "Write a caption..."
          }
          value={caption}
          onChange={(event) =>
            setCaption(
              event.target.value
            )
          }
        />

        {!isStory && (
          <>
            <input
              className="formField"
              placeholder="Title"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
            />

            <select
              className="formField"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              {categoryOptions.map(
                (option) => (
                  <option key={option}>
                    {option}
                  </option>
                )
              )}
            </select>

            <section className="destinationPanel">
              <h3>Share To</h3>

              <div className="destinationGrid">
                {(
                  [
                    "feed",
                    "profile",
                    "world",
                  ] as Destination[]
                ).map((destination) => (
                  <button
                    key={destination}
                    className={
                      destinations[
                        destination
                      ]
                        ? "destinationButton activeDestination"
                        : "destinationButton"
                    }
                    onClick={() =>
                      toggleDestination(
                        destination
                      )
                    }
                  >
                    {destination === "feed"
                      ? "📱 Feed"
                      : destination ===
                        "profile"
                      ? "👤 Profile"
                      : "🌍 World"}
                  </button>
                ))}
              </div>
            </section>

            {destinations.world && (
              <section className="worldFields">
                <select
                  className="formField"
                  value={worldType}
                  onChange={(event) =>
                    setWorldType(
                      event.target.value
                    )
                  }
                >
                  <option>Feed</option>
                  <option>Live</option>
                  <option>Event</option>
                  <option>Casting</option>
                  <option>
                    Build Together
                  </option>
                  <option>Music</option>
                  <option>Podcast</option>
                  <option>Business</option>
                  <option>Sports</option>
                  <option>Comedy</option>
                </select>

                <div className="twoFields">
                  <input
                    className="formField"
                    placeholder="City"
                    value={city}
                    onChange={(event) =>
                      setCity(
                        event.target.value
                      )
                    }
                  />

                  <input
                    className="formField"
                    placeholder="State"
                    value={stateName}
                    onChange={(event) =>
                      setStateName(
                        event.target.value
                      )
                    }
                  />
                </div>
              </section>
            )}
          </>
        )}

        <button
          className="shareButton"
          disabled={
            posting ||
            (!file &&
              !linkUrl.trim())
          }
          onClick={submitCreation}
        >
          {posting
            ? "Posting..."
            : isStory
            ? "Share Story"
            : "Post to UTV"}
        </button>

        <button
          className="cancelButton"
          onClick={resetCreator}
        >
          Cancel
        </button>

        {message && (
          <p className="submitMessage">
            {message}
          </p>
        )}
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
    overflow-x: hidden;
    color: white;
    background:
      radial-gradient(circle at 10% 0%, rgba(82,247,200,.16), transparent 30%),
      radial-gradient(circle at 90% 7%, rgba(123,97,255,.22), transparent 35%),
      linear-gradient(180deg, #07111e, #000);
  }

  .creatorHero {
    margin: 16px;
    padding: 24px;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 26px;
    background: rgba(255,255,255,.065);
    backdrop-filter: blur(18px);
  }

  .creatorHero p,
  .eyebrow {
    margin: 0 0 8px;
    color: #52f7c8;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .creatorHero h1,
  .linkPanel h1 {
    margin: 0;
    font-size: 39px;
    letter-spacing: -1.5px;
  }

  .creatorHero span {
    display: block;
    margin-top: 10px;
    color: rgba(255,255,255,.62);
    line-height: 1.5;
  }

  .creatorGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: 12px;
    padding: 0 16px;
  }

  .creatorCard {
    min-height: 155px;
    padding: 16px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 23px;
    background: rgba(255,255,255,.06);
  }

  .creatorCard:active {
    transform: scale(.98);
  }

  .creatorIcon {
    font-size: 34px;
  }

  .creatorCard h3 {
    margin: 12px 0 5px;
  }

  .creatorCard p {
    margin: 0;
    color: rgba(255,255,255,.55);
    font-size: 13px;
    line-height: 1.4;
  }

  .linkPanel {
    max-width: 680px;
    display: grid;
    gap: 13px;
    margin: 0 auto;
    padding: 22px 16px 120px;
  }

  .backPill {
    width: max-content;
    padding: 10px 14px;
    color: white;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 999px;
    background: rgba(255,255,255,.07);
  }

  .formField {
    width: 100%;
    padding: 15px 16px;
    color: white;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 18px;
    outline: none;
    background: rgba(255,255,255,.08);
  }

  .formField option {
    color: #000;
  }

  .captionField {
    min-height: 92px;
    resize: vertical;
  }

  .utvCameraPage {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: grid;
    grid-template-rows: auto minmax(0,1fr) auto;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    color: white;
    background: #000;
  }

  .cameraHeader {
    min-height: 88px;
    display: grid;
    grid-template-columns: 58px 1fr 58px;
    align-items: center;
    gap: 10px;
    padding:
      max(14px, env(safe-area-inset-top))
      18px
      12px;
    background: linear-gradient(180deg,#07111e,#020408);
    border-bottom: 1px solid rgba(255,255,255,.08);
  }

  .cameraHeaderButton {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    color: white;
    border: 0;
    border-radius: 50%;
    background: rgba(255,255,255,.07);
    font-size: 29px;
  }

  .flipButton {
    gap: 0;
    font-size: 23px;
  }

  .flipButton small {
    margin-top: -5px;
    font-size: 10px;
  }

  .cameraBrand {
    display: grid;
    justify-items: center;
    line-height: 1;
  }

  .cameraBrand strong {
    color: #72ff98;
    font-size: 36px;
    font-weight: 1000;
    letter-spacing: -2px;
    text-shadow: 0 0 18px rgba(82,247,200,.35);
  }

  .cameraBrand span {
    margin-top: 5px;
    color: #8d63ff;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .cameraViewport {
    position: relative;
    min-height: 0;
    overflow: hidden;
    background: #000;
  }

  .cameraPreview {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    object-position: center;
    background: #000;
  }

  .cameraShade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(0,0,0,.03),
        transparent 18%,
        transparent 75%,
        rgba(0,0,0,.28)
      );
  }

  .cameraMessage {
    position: absolute;
    right: 18px;
    bottom: 18px;
    left: 18px;
    padding: 12px;
    text-align: center;
    color: #52f7c8;
    border-radius: 16px;
    background: rgba(0,0,0,.72);
    backdrop-filter: blur(14px);
  }

  .cameraControls {
    padding:
      17px
      12px
      max(17px, env(safe-area-inset-bottom));
    background: linear-gradient(180deg,#05070b,#000);
    border-top: 1px solid rgba(255,255,255,.08);
  }

  .cameraModeRow {
    display: grid;
    grid-template-columns:
      minmax(45px,1fr)
      minmax(45px,1fr)
      92px
      minmax(45px,1fr)
      minmax(45px,1fr);
    align-items: center;
    gap: 7px;
  }

  .cameraModeButton {
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 5px 2px;
    color: white;
    border: 0;
    background: transparent;
    font-weight: 850;
  }

  .cameraModeButton span {
    font-size: 27px;
  }

  .cameraModeButton small {
    font-size: 11px;
  }

  .mainCaptureButton {
    width: 84px;
    height: 84px;
    display: grid;
    place-items: center;
    padding: 7px;
    border: 5px solid #7b61ff;
    border-radius: 50%;
    background: transparent;
    box-shadow:
      0 0 0 3px rgba(255,255,255,.85),
      0 0 24px rgba(123,97,255,.42);
  }

  .mainCaptureButton span {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 50%;
    background: white;
  }

  .recordingCapture {
    border-color: #ff4d57;
    animation: recordingPulse 1s infinite;
  }

  .recordingCapture span {
    width: 52%;
    height: 52%;
    border-radius: 10px;
    background: #ff4d57;
  }

  @keyframes recordingPulse {
    50% {
      transform: scale(.94);
      box-shadow:
        0 0 0 3px rgba(255,255,255,.85),
        0 0 35px rgba(255,77,87,.7);
    }
  }

  .cameraHelp {
    margin: 13px 0 0;
    color: rgba(255,255,255,.58);
    font-size: 11px;
    text-align: center;
  }

  .editorPage {
    min-height: 100vh;
    padding-bottom: 100px;
    overflow-x: hidden;
    color: white;
    background: #000;
  }

  .editorHeader {
    position: sticky;
    top: 0;
    z-index: 40;
    display: grid;
    grid-template-columns: 50px 1fr 70px;
    align-items: center;
    gap: 10px;
    padding:
      max(12px, env(safe-area-inset-top))
      14px
      12px;
    background: rgba(0,0,0,.84);
    backdrop-filter: blur(18px);
  }

  .editorHeader strong {
    text-align: center;
  }

  .circleButton,
  .shareTopButton {
    color: white;
    border: 1px solid rgba(255,255,255,.16);
    background: rgba(255,255,255,.07);
  }

  .circleButton {
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }

  .shareTopButton {
    padding: 10px 13px;
    color: #52f7c8;
    border-radius: 999px;
    font-weight: 950;
  }

  .editorCanvas {
    position: relative;
    width: 100%;
    height: min(68vh, 720px);
    min-height: 470px;
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
    place-items: center;
    color: rgba(255,255,255,.5);
  }

  .textLayer,
  .stickerLayer {
    position: absolute;
    z-index: 20;
    transform: translate(-50%,-50%);
    user-select: none;
    touch-action: none;
  }

  .textLayer {
    max-width: 88%;
    padding: 6px 10px;
    text-align: center;
    font-weight: 950;
    white-space: pre-wrap;
  }

  .selectedLayer {
    outline: 2px dashed #52f7c8;
    outline-offset: 5px;
  }

  .drawingCanvas {
    position: absolute;
    inset: 0;
    z-index: 15;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .activeDrawing {
    pointer-events: auto;
    touch-action: none;
  }

  .musicBadge {
    position: absolute;
    left: 15px;
    bottom: 15px;
    z-index: 24;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 74%;
    padding: 9px 12px;
    border-radius: 999px;
    background: rgba(0,0,0,.62);
    backdrop-filter: blur(14px);
  }

  .musicBadge div {
    min-width: 0;
    display: grid;
  }

  .musicBadge strong,
  .musicBadge small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .musicBadge small {
    color: rgba(255,255,255,.62);
  }

  .editorToolbar {
    display: flex;
    justify-content: center;
    gap: 11px;
    overflow-x: auto;
    padding: 14px;
    background: linear-gradient(180deg,#050505,#101010);
  }

  .toolButton {
    min-width: 58px;
    display: grid;
    justify-items: center;
    gap: 4px;
    padding: 8px;
    color: white;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 17px;
    background: rgba(255,255,255,.06);
  }

  .toolButton span,
  .toolButton strong {
    font-size: 22px;
  }

  .toolButton small {
    font-size: 10px;
  }

  .activeTool {
    border-color: #52f7c8;
    box-shadow: 0 0 16px rgba(82,247,200,.3);
  }

  .editorOptions {
    max-width: 680px;
    display: grid;
    gap: 13px;
    margin: 0 auto;
    padding: 15px 15px 110px;
    background:
      radial-gradient(circle at top,rgba(82,247,200,.08),transparent 28%),
      linear-gradient(180deg,#10141c,#020304);
  }

  .optionPanel,
  .musicPanel,
  .destinationPanel {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 20px;
    background: rgba(255,255,255,.055);
  }

  .colorRow,
  .sizeRow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    flex-wrap: wrap;
  }

  .colorDot {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(255,255,255,.72);
    border-radius: 50%;
  }

  .selectedColor {
    outline: 3px solid #52f7c8;
    outline-offset: 3px;
  }

  .sizeRow button {
    padding: 8px 12px;
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 999px;
    background: rgba(255,255,255,.07);
  }

  .stickerTray {
    display: flex;
    gap: 9px;
    overflow-x: auto;
  }

  .stickerTray button {
    flex: 0 0 auto;
    width: 45px;
    height: 45px;
    font-size: 24px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 50%;
    background: rgba(255,255,255,.06);
  }

  .musicUpload {
    display: grid;
    gap: 4px;
    padding: 15px;
    text-align: center;
    border: 1px dashed rgba(82,247,200,.55);
    border-radius: 17px;
    background: rgba(82,247,200,.06);
  }

  .musicUpload small {
    color: rgba(255,255,255,.55);
  }

  .audioPreview {
    width: 100%;
  }

  .removeMusicButton {
    padding: 12px;
    color: white;
    border: 1px solid rgba(255,77,87,.42);
    border-radius: 16px;
    background: rgba(255,77,87,.12);
  }

  .destinationPanel h3 {
    margin: 0;
  }

  .destinationGrid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 8px;
  }

  .destinationButton {
    padding: 12px 8px;
    color: rgba(255,255,255,.72);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 15px;
    background: rgba(0,0,0,.25);
    font-weight: 850;
  }

  .activeDestination {
    color: #06120d;
    border-color: transparent;
    background: linear-gradient(135deg,#52f7c8,#7b61ff);
  }

  .worldFields {
    display: grid;
    gap: 10px;
  }

  .twoFields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .shareButton,
  .cancelButton {
    width: 100%;
    padding: 16px;
    border-radius: 18px;
    font-weight: 950;
    font-size: 16px;
  }

  .shareButton {
    color: #06120d;
    border: 0;
    background: linear-gradient(135deg,#52f7c8,#7b61ff);
  }

  .cancelButton {
    color: white;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.07);
  }

  .submitMessage {
    margin: 0;
    padding: 13px;
    color: #52f7c8;
    text-align: center;
    border-radius: 16px;
    background: rgba(82,247,200,.08);
    font-weight: 850;
  }

  @media (min-width: 800px) {
    .creatorGrid {
      grid-template-columns: repeat(4,minmax(0,1fr));
      max-width: 1150px;
      margin: 0 auto;
    }

    .creatorHero {
      max-width: 1118px;
      margin-right: auto;
      margin-left: auto;
    }

    .editorCanvas,
    .editorToolbar {
      max-width: 620px;
      margin-right: auto;
      margin-left: auto;
    }
  }
    .cameraOverlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.cameraTopBar,
.cameraBottomBar,
.cameraQuickModes,
.cameraError {
  pointer-events: auto;
}

.cameraTopBar {
  display: grid;
  grid-template-columns: 52px 1fr 52px;
  align-items: center;
  gap: 12px;
  padding:
    max(14px, env(safe-area-inset-top))
    16px
    12px;
  background: linear-gradient(
    180deg,
    rgba(0,0,0,.86),
    rgba(0,0,0,.28),
    transparent
  );
}

.cameraCircleButton {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  color: white;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 50%;
  background: rgba(0,0,0,.52);
  backdrop-filter: blur(12px);
  font-size: 24px;
}

.cameraLogo {
  display: grid;
  justify-items: center;
  line-height: 1;
}

.cameraLogo strong {
  color: white;
  font-size: 28px;
  font-weight: 1000;
  letter-spacing: -1px;
}

.cameraLogo span {
  margin-top: 5px;
  color: #52f7c8;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 2px;
}

.cameraBottomBar {
  display: grid;
  grid-template-columns: 1fr 94px 1fr;
  align-items: center;
  gap: 20px;
  padding:
    16px
    28px
    max(70px, calc(env(safe-area-inset-bottom) + 56px));
  background: linear-gradient(
    0deg,
    rgba(0,0,0,.94),
    rgba(0,0,0,.48),
    transparent
  );
}

.cameraSideControl {
  display: grid;
  justify-items: center;
  gap: 6px;
  color: white;
  border: 0;
  background: transparent;
  font-weight: 850;
}

.cameraSideControl span {
  font-size: 28px;
}

.cameraSideControl small {
  font-size: 11px;
}

.cameraCaptureButton {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  padding: 7px;
  border: 5px solid #7b61ff;
  border-radius: 50%;
  background: transparent;
  box-shadow:
    0 0 0 3px white,
    0 0 25px rgba(123,97,255,.45);
}

.cameraCaptureButton span {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: white;
}

.cameraCaptureButton.recording {
  border-color: #ff4d57;
  animation: cameraPulse 1s infinite;
}

.cameraCaptureButton.recording span {
  width: 52%;
  height: 52%;
  border-radius: 10px;
  background: #ff4d57;
}

.cameraQuickModes {
  position: fixed;
  right: 0;
  bottom: max(16px, env(safe-area-inset-bottom));
  left: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  gap: 18px;
}

.cameraQuickModes button {
  padding: 8px 13px;
  color: rgba(255,255,255,.7);
  border: 0;
  border-radius: 999px;
  background: rgba(0,0,0,.45);
  backdrop-filter: blur(12px);
  font-weight: 900;
}

.cameraQuickModes button:nth-child(1) {
  color: #52f7c8;
}

.cameraError {
  position: fixed;
  right: 18px;
  bottom: 180px;
  left: 18px;
  z-index: 40;
  padding: 12px;
  color: #52f7c8;
  text-align: center;
  border-radius: 16px;
  background: rgba(0,0,0,.75);
}

@keyframes cameraPulse {
  50% {
    transform: scale(.94);
    box-shadow:
      0 0 0 3px white,
      0 0 36px rgba(255,77,87,.75);
  }
}
`;