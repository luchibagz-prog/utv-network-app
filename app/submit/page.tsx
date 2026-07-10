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
    desc: "Share hosted videos, images, or flyers.",
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

  const [mode, setMode] = useState<
    "hub" | "camera" | "editor" | "link"
  >("hub");

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
    const text = window.prompt("Type your story text");

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

  function updateSelectedText(
    changes: Partial<TextLayer>
  ) {
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
    const point = event;

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

  function moveText(event: React.PointerEvent<HTMLDivElement>) {
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

  function endTextDrag() {
    draggingTextRef.current = null;
  }

  function beginStickerDrag(
    event: React.PointerEvent<HTMLDivElement>,
    sticker: StickerLayer
  ) {
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

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  function beginDrawing(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawingEnabled) return;

    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const bounds = canvas.getBoundingClientRect();

    context.beginPath();
    context.moveTo(
      event.clientX - bounds.left,
      event.clientY - bounds.top
    );

    drawingRef.current = true;
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
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

  function endDrawing() {
    drawingRef.current = false;
  }

  function clearDrawing() {
    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const bounds = canvas.getBoundingClientRect();

    context.clearRect(0, 0, bounds.width, bounds.height);
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
      }, 500);
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
        } else if (
          destinations.profile &&
          !destinations.feed
        ) {
          router.push("/profile");
        } else if (uploadId) {
          router.push("/feed");
        } else {
          router.push("/feed");
        }
      }, 600);
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
    /* ===========================
     RENDER
     =========================== */

  if (mode === "hub") {
    return (
      <main className="submitPage">
        <UTVNav />

        <section className="creatorGrid">
          {createOptions.map((option) => (
            <button
              key={option.title}
              className="creatorCard"
              onClick={() => {
                if (option.route) {
                  router.push(option.route);
                  return;
                }
      startCreate(option.type || "feed");
              }}
            >
              <span className="creatorIcon">
                {option.icon}
              </span>

              <h3>{option.title}</h3>

              <p>{option.desc}</p>
            </button>
          ))}
        </section>
      </main>
    );
  }

  if (mode === "camera") {
    return (
      <main className="storyCamera">

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="cameraPreview"
        />

        <div className="cameraTop">

          <button onClick={resetCreator}>
            ✕
          </button>

          <button onClick={flipCamera}>
            🔄
          </button>

        </div>

        <div className="cameraBottom">

          <label className="galleryButton">

            🖼

            <input
              hidden
              type="file"
              accept="image/*,video/*"
              onChange={pickFile}
            />

          </label>

          {!recording ? (

            <button
              className="captureButton"
              onClick={capturePhoto}
            />

          ) : (

            <button
              className="captureButton recording"
              onClick={stopRecording}
            />

          )}

          {!recording ? (

            <button
              className="videoButton"
              onClick={startRecording}
            >
              🎥
            </button>

          ) : (

            <button
              className="videoButton"
              onClick={stopRecording}
            >
              ■
            </button>

          )}

        </div>

      </main>
    );
  }

  return (

    <main className="storyEditor">

      <div className="storyCanvas">

        {previewIsVideo ? (

          <video
            src={previewUrl}
            controls
            playsInline
            className="editorMedia"
          />

        ) : (

          <img
            src={previewUrl}
            className="editorMedia"
          />

        )}

        <canvas
          ref={drawingCanvasRef}
          className="drawingLayer"
          onPointerDown={beginDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
        />

        {textLayers.map((layer)=>(
          <div
            key={layer.id}
            className="storyText"
            onPointerDown={(e)=>beginTextDrag(e,layer)}
            onPointerMove={moveText}
            onPointerUp={endTextDrag}
            style={{
              left:`${layer.x}%`,
              top:`${layer.y}%`,
              color:layer.color,
              fontSize:layer.size
            }}
          >
            {layer.text}
          </div>
        ))}

        {stickers.map((sticker)=>(
          <div
            key={sticker.id}
            className="storySticker"
            onPointerDown={(e)=>beginStickerDrag(e,sticker)}
            onPointerMove={moveSticker}
            onPointerUp={endStickerDrag}
            style={{
              left:`${sticker.x}%`,
              top:`${sticker.y}%`,
              fontSize:sticker.size
            }}
          >
            {sticker.value}
          </div>
        ))}

      </div>

      <div className="storyToolbar">

        <button onClick={addTextLayer}>
          Aa
        </button>

        <button onClick={()=>setShowMusicPanel(true)}>
          🎵
        </button>

        <button onClick={()=>setDrawingEnabled(!drawingEnabled)}>
          ✏️
        </button>

        <button onClick={()=>{
          const emoji=window.prompt("Sticker");

          if(emoji){
            addSticker(emoji);
          }
        }}>
          😊
        </button>

      </div>

      <textarea
        placeholder="Say something..."
        value={caption}
        onChange={(e)=>setCaption(e.target.value)}
      />

      {!isStory && (

        <>

          <input
            placeholder="Title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
          />

          <select
            value={category}
            onChange={(e)=>setCategory(e.target.value)}
          >
            {categoryOptions.map((c)=>(
              <option key={c}>{c}</option>
            ))}
          </select>

        </>

      )}

      {showMusicPanel && (

        <section className="musicPanel">

          <input
            placeholder="Song title"
            value={musicTitle}
            onChange={(e)=>setMusicTitle(e.target.value)}
          />

          <input
            placeholder="Artist"
            value={musicArtist}
            onChange={(e)=>setMusicArtist(e.target.value)}
          />

          <input
            type="file"
            accept="audio/*"
            onChange={pickMusicFile}
          />

          <input
            placeholder="or paste MP3 URL"
            value={musicUrl}
            onChange={(e)=>setMusicUrl(e.target.value)}
          />

        </section>

      )}

      {!isStory && (

        <section className="publishPanel">

          <h3>Share To</h3>

          <label>

            <input
              type="checkbox"
              checked={destinations.feed}
              onChange={()=>toggleDestination("feed")}
            />

            Feed

          </label>

          <label>

            <input
              type="checkbox"
              checked={destinations.profile}
              onChange={()=>toggleDestination("profile")}
            />

            Profile

          </label>

          <label>

            <input
              type="checkbox"
              checked={destinations.world}
              onChange={()=>toggleDestination("world")}
            />

            World

          </label>

        </section>

      )}

      <button
        className="shareButton"
        disabled={posting}
        onClick={submitCreation}
      >

        {posting
          ? "Posting..."
          : isStory
          ? "Share Story"
          : "Post to UTV"}

      </button>

      {message && (

        <p className="submitMessage">
          {message}
        </p>

      )}

    </main>

  );
}