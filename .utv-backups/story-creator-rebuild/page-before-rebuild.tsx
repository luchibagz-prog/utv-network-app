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

type Mode = "hub" | "camera" | "editor" | "link";
type CameraFacing = "user" | "environment";
type Destination = "feed" | "profile" | "world";

type TextLayer = {
  id: string;
  text: string;
  color: string;
  size: number;
  x: number;
  y: number;
};

type StickerLayer = {
  id: string;
  value: string;
  size: number;
  x: number;
  y: number;
};

type DragState = {
  id: string;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
};

const mainCreateOptions = [
  {
    title: "Story",
    icon: "📖",
    description: "Share a photo or video for 24 hours.",
    type: "story",
  },
  {
    title: "Feed Post",
    icon: "📱",
    description: "Post photos, videos, and updates.",
    type: "feed",
  },
  {
    title: "Go Live",
    icon: "🔴",
    description: "Broadcast and connect in real time.",
    route: "/live-room",
  },
];

const moreCreateOptions = [
  {
    title: "Paste Link",
    icon: "🔗",
    description: "Share hosted videos, images, or flyers.",
    type: "link",
  },
  {
    title: "TV Show",
    icon: "🎬",
    description: "Upload a show or episode.",
    type: "show",
  },
  {
    title: "Movie",
    icon: "🎥",
    description: "Upload a movie or short film.",
    type: "movie",
  },
  {
    title: "Podcast",
    icon: "🎤",
    description: "Upload a podcast episode.",
    type: "podcast",
  },
  {
    title: "Music Video",
    icon: "🎵",
    description: "Share music and visuals.",
    type: "music",
  },
  {
    title: "Sports",
    icon: "🏀",
    description: "Post sports content.",
    type: "sports",
  },
  {
    title: "Comedy",
    icon: "😂",
    description: "Post comedy or skits.",
    type: "comedy",
  },
  {
    title: "Event",
    icon: "🎉",
    description: "Promote an event.",
    route: "/events/new",
  },
  {
    title: "Casting",
    icon: "🎭",
    description: "Find talent.",
    route: "/casting/new",
  },
  {
    title: "Build Together",
    icon: "🤝",
    description: "Find collaborators.",
    route: "/collabs/new",
  },
];

const categories = [
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

const textColors = [
  "#ffffff",
  "#52f7c8",
  "#7b61ff",
  "#ffd166",
  "#ff5ca8",
  "#ff5f57",
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function cleanFileName(name: string) {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);
}

function isEmbedUrl(url: string) {
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

  const draggingTextRef = useRef<DragState | null>(null);
  const draggingStickerRef = useRef<DragState | null>(null);

  const [mode, setMode] = useState<Mode>("hub");
  const [creationType, setCreationType] = useState("feed");

  const [cameraFacing, setCameraFacing] =
    useState<CameraFacing>("environment");

  const [recording, setRecording] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [mediaFit, setMediaFit] = useState<
    "contain" | "cover" | "original"
  >("contain");
  const [mediaScale, setMediaScale] = useState(1);
  const [mediaX, setMediaX] = useState(0);
  const [mediaY, setMediaY] = useState(0);
  const [mediaRotation, setMediaRotation] = useState(0);
  const [blurBackground, setBlurBackground] = useState(false);

  const mediaPointersRef = useRef<
    Map<number, { x: number; y: number }>
  >(new Map());

  const mediaGestureRef = useRef<{
    startDistance: number;
    startAngle: number;
    startScale: number;
    startRotation: number;
    dragStartX: number;
    dragStartY: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  const [linkUrl, setLinkUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Feed");

  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState("");

  const [stickers, setStickers] = useState<StickerLayer[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState("");

  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");

  const [destinations, setDestinations] = useState<
    Record<Destination, boolean>
  >({
    feed: true,
    profile: true,
    world: false,
  });

  const [worldType, setWorldType] = useState("Feed");
  const [city, setCity] = useState("Sacramento");
  const [stateName, setStateName] = useState("CA");

  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  const isStory = creationType === "story";
const selectedText = textLayers.find(
  (layer) => layer.id === selectedTextId
);

const selectedSticker = stickers.find(
  (sticker) => sticker.id === selectedStickerId
);
  const selectedDestinations = useMemo(
    () =>
      Object.entries(destinations)
        .filter(([, enabled]) => enabled)
        .map(([destination]) => destination),
    [destinations]
  );

  const previewUrl = preview || linkUrl.trim();

  const previewIsVideo =
    Boolean(file?.type.startsWith("video")) ||
    isVideoUrl(previewUrl) ||
    isEmbedUrl(previewUrl);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type");

    if (requestedType) {
      startCreate(requestedType);
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
    };
  }, [preview]);

  function resetCreator() {
    stopCamera();

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setMode("hub");
    setCreationType("feed");

    setFile(null);
    setPreview("");
    setMediaFit("contain");
    setMediaScale(1);
    setMediaX(0);
    setMediaY(0);
    setMediaRotation(0);
    setBlurBackground(false);
    setLinkUrl("");
    setCoverUrl("");

    setTitle("");
    setCaption("");
    setCategory("Feed");

    setTextLayers([]);
    setSelectedTextId("");

    setStickers([]);
    setSelectedStickerId("");

    setMusicFile(null);
    setMusicUrl("");
    setMusicTitle("");

    setDestinations({
      feed: true,
      profile: true,
      world: false,
    });

    setWorldType("Feed");
    setCity("Sacramento");
    setStateName("CA");

    setMessage("");
    setPosting(false);
  }

  function startCreate(type: string) {
    const categoryMap: Record<string, string> = {
      story: "Feed",
      feed: "Feed",
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
    setMessage("");

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

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not supported on this device.");
      }

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
        "Allow camera and microphone access, or choose a file from Gallery."
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

    event.target.value = "";

    if (!selectedFile) return;

    if (
      !selectedFile.type.startsWith("image/") &&
      !selectedFile.type.startsWith("video/")
    ) {
      setMessage("Choose a photo or video.");
      return;
    }

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setMediaFit("contain");
    setMediaScale(1);
    setMediaX(0);
    setMediaY(0);
    setMediaRotation(0);
    setBlurBackground(false);
    setLinkUrl("");

    stopCamera();
    setMode("editor");
    setMessage("");
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setMessage("Camera is still starting. Try again.");
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setMessage("Could not capture the photo.");
      return;
    }

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
        if (!blob) {
          setMessage("Could not capture the photo.");
          return;
        }

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

    const preferredType =
      MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

    try {
      const recorder = new MediaRecorder(
        streamRef.current,
        preferredType
          ? {
              mimeType: preferredType,
            }
          : undefined
      );

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: preferredType || "video/webm",
        });

        const recordedFile = new File(
          [blob],
          `utv-video-${Date.now()}.webm`,
          {
            type: preferredType || "video/webm",
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
    } catch (error) {
      console.error(error);
      setMessage("Video recording could not start.");
    }
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
      isStory ? "Add text to your story" : "Add text to your post"
    );

    if (!text?.trim()) return;

    const layer: TextLayer = {
      id: makeId("text"),
      text: text.trim(),
      color: "#ffffff",
      size: 32,
      x: 50,
      y: 38,
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
      y: 52,
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
    event.preventDefault();
    event.stopPropagation();

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

    event.preventDefault();

    const editorBounds =
      event.currentTarget.parentElement?.getBoundingClientRect();

    if (!editorBounds) return;

    const moveX =
      ((event.clientX - drag.startX) / editorBounds.width) *
      100;

    const moveY =
      ((event.clientY - drag.startY) /
        editorBounds.height) *
      100;

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
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    draggingTextRef.current = null;
  }

  function beginStickerDrag(
    event: React.PointerEvent<HTMLDivElement>,
    sticker: StickerLayer
  ) {
    event.preventDefault();
    event.stopPropagation();

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

    event.preventDefault();

    const editorBounds =
      event.currentTarget.parentElement?.getBoundingClientRect();

    if (!editorBounds) return;

    const moveX =
      ((event.clientX - drag.startX) / editorBounds.width) *
      100;

    const moveY =
      ((event.clientY - drag.startY) /
        editorBounds.height) *
      100;

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
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    draggingStickerRef.current = null;
  }

  function chooseMusic(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    event.target.value = "";

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("audio/")) {
      setMessage("Choose an audio file.");
      return;
    }

    setMusicFile(selectedFile);
    setMusicUrl("");

    if (!musicTitle) {
      setMusicTitle(
        selectedFile.name.replace(/\.[^/.]+$/, "")
      );
    }

    setMessage("");
  }

  function removeMusic() {
    setMusicFile(null);
    setMusicUrl("");
    setMusicTitle("");
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
        mediaType: isImageUrl(cleanLink)
          ? "image"
          : isVideoUrl(cleanLink)
          ? "video"
          : isEmbedUrl(cleanLink)
          ? "embed"
          : "link",
        thumbnail:
          coverUrl.trim() ||
          (isImageUrl(cleanLink) ? cleanLink : ""),
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

    return musicUrl.trim();
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
            music_title: musicTitle.trim() || null,
            text_overlay: textLayers,
            stickers,
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .select("id")
          .single();

      if (storyError) {
        throw storyError;
      }

      if (storyRow?.id) {
        router.push(`/stories/${storyRow.id}`);
      } else {
        router.push("/feed");
      }
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
        const worldPayload = {
          creator_email: user.email,
          title: title.trim() || "UTV World Post",
          description: caption.trim(),
          world_type: worldType || category || "Feed",
          city: city.trim(),
          state: stateName.trim(),
          location:
            city || stateName
              ? `${city.trim()}${
                  city && stateName ? ", " : ""
                }${stateName.trim()}`
              : "UTV World",
          is_live: false,
          video_url: isVideo ? media.mediaUrl : "",
          media_url: media.mediaUrl,
        };

        const { error: worldError } = await supabase
          .from("world_posts")
          .insert(worldPayload);

        if (worldError) {
          throw worldError;
        }
      }

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

      router.push(uploadId ? "/feed" : "/feed");
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Could not post to UTV."
      );
    } finally {
      setPosting(false);
    }
  }

  function resetMediaFrame() {
    setMediaFit("contain");
    setMediaScale(1);
    setMediaX(0);
    setMediaY(0);
    setMediaRotation(0);
    setBlurBackground(false);
  }

  function pointerDistance(
    first: { x: number; y: number },
    second: { x: number; y: number }
  ) {
    return Math.hypot(
      second.x - first.x,
      second.y - first.y
    );
  }

  function pointerAngle(
    first: { x: number; y: number },
    second: { x: number; y: number }
  ) {
    return (
      Math.atan2(
        second.y - first.y,
        second.x - first.x
      ) *
      (180 / Math.PI)
    );
  }

  function beginMediaDrag(
    event: React.PointerEvent<HTMLElement>
  ) {
    event.preventDefault();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    mediaPointersRef.current.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      }
    );

    const pointers = Array.from(
      mediaPointersRef.current.values()
    );

    if (pointers.length === 1) {
      mediaGestureRef.current = {
        startDistance: 0,
        startAngle: 0,
        startScale: mediaScale,
        startRotation: mediaRotation,
        dragStartX: event.clientX,
        dragStartY: event.clientY,
        originalX: mediaX,
        originalY: mediaY,
      };
    }

    if (pointers.length === 2) {
      mediaGestureRef.current = {
        startDistance: pointerDistance(
          pointers[0],
          pointers[1]
        ),
        startAngle: pointerAngle(
          pointers[0],
          pointers[1]
        ),
        startScale: mediaScale,
        startRotation: mediaRotation,
        dragStartX: 0,
        dragStartY: 0,
        originalX: mediaX,
        originalY: mediaY,
      };
    }
  }

  function moveMedia(
    event: React.PointerEvent<HTMLElement>
  ) {
    if (
      !mediaPointersRef.current.has(
        event.pointerId
      )
    ) {
      return;
    }

    event.preventDefault();

    mediaPointersRef.current.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      }
    );

    const pointers = Array.from(
      mediaPointersRef.current.values()
    );

    const gesture =
      mediaGestureRef.current;

    if (!gesture) return;

    if (pointers.length >= 2) {
      const distance = pointerDistance(
        pointers[0],
        pointers[1]
      );

      const angle = pointerAngle(
        pointers[0],
        pointers[1]
      );

      const nextScale =
        gesture.startDistance > 0
          ? gesture.startScale *
            (distance /
              gesture.startDistance)
          : gesture.startScale;

      setMediaScale(
        Math.max(
          0.5,
          Math.min(4, nextScale)
        )
      );

      setMediaRotation(
        gesture.startRotation +
          (angle - gesture.startAngle)
      );

      return;
    }

    const bounds =
      event.currentTarget.parentElement
        ?.getBoundingClientRect();

    if (!bounds) return;

    const movementX =
      ((event.clientX -
        gesture.dragStartX) /
        bounds.width) *
      100;

    const movementY =
      ((event.clientY -
        gesture.dragStartY) /
        bounds.height) *
      100;

    setMediaX(
      Math.max(
        -100,
        Math.min(
          100,
          gesture.originalX +
            movementX
        )
      )
    );

    setMediaY(
      Math.max(
        -100,
        Math.min(
          100,
          gesture.originalY +
            movementY
        )
      )
    );
  }

  function endMediaDrag(
    event: React.PointerEvent<HTMLElement>
  ) {
    mediaPointersRef.current.delete(
      event.pointerId
    );

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    const remaining = Array.from(
      mediaPointersRef.current.values()
    );

    if (remaining.length === 1) {
      mediaGestureRef.current = {
        startDistance: 0,
        startAngle: 0,
        startScale: mediaScale,
        startRotation: mediaRotation,
        dragStartX: remaining[0].x,
        dragStartY: remaining[0].y,
        originalX: mediaX,
        originalY: mediaY,
      };
    } else if (remaining.length === 0) {
      mediaGestureRef.current = null;
    }
  }

  const mediaObjectFit =
    mediaFit === "original"
      ? "contain"
      : mediaFit;

  const mediaTransform = `
    translate(${mediaX}%, ${mediaY}%)
    rotate(${mediaRotation}deg)
    scale(${mediaScale})
  `;

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
          {mainCreateOptions.map((option) => (
            <button
              key={option.title}
              className={`mainCreateCard ${
                option.title === "Story"
                  ? "storyCreateCard"
                  : option.title === "Feed Post"
                  ? "feedCreateCard"
                  : "liveCreateCard"
              }`}
              onClick={() => {
                if (option.route) {
                  router.push(option.route);
                  return;
                }

                startCreate(option.type || "feed");
              }}
            >
              <span>{option.icon}</span>

              <div>
                <h2>{option.title}</h2>
                <p>{option.description}</p>
              </div>
            </button>
          ))}
        </section>

        <section className="moreCreateSection">
          <div className="sectionHeading">
            <h2>More Ways to Create</h2>
            <span>Build your audience on UTV</span>
          </div>

          <div className="moreCreateGrid">
            {moreCreateOptions.map((option) => (
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
                <p>{option.description}</p>
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

          <p className="eyebrow">SHARE A LINK</p>
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
            {categories.map((option) => (
              <option key={option}>{option}</option>
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
            {posting ? "Posting..." : "Post to UTV"}
          </button>

          {message && (
            <p className="submitMessage">{message}</p>
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
            <strong>U TV</strong>
            <span>
              {isStory ? "STORY" : "CREATE"}
            </span>
          </div>

          <button
            className="cameraHeaderButton"
            onClick={flipCamera}
            aria-label="Flip camera"
          >
            ⟳
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
              transform:
                cameraFacing === "user"
                  ? "scaleX(-1)"
                  : "none",
            }}
          />

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
                {recording ? "⏹️" : "🎥"}
              </span>

              <small>
                {recording ? "Stop" : "Video"}
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

          <div className="cameraQuickModes">
            <button
              className={
                isStory ? "activeQuickMode" : ""
              }
              onClick={() =>
                setCreationType("story")
              }
            >
              Story
            </button>

            <button
              className={
                !isStory ? "activeQuickMode" : ""
              }
              onClick={() =>
                setCreationType("feed")
              }
            >
              Post
            </button>

            <button
              onClick={() =>
                router.push("/live-room")
              }
            >
              Live
            </button>
          </div>
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
          {isStory ? "Edit Story" : "Edit Post"}
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
            : "Post"}
        </button>
      </header>

      <section className="editorCanvas">
        {blurBackground &&
          previewUrl &&
          !previewIsVideo && (
            <div
              className="mediaBlurBackdrop"
              style={{
                backgroundImage:
                  `url("${previewUrl}")`,
              }}
            />
          )}
        {previewIsVideo ? (
          <video
            src={previewUrl}
            className="editorMedia"
            autoPlay
            loop
            muted
            playsInline
            controls
            onPointerDown={beginMediaDrag}
            onPointerMove={moveMedia}
            onPointerUp={endMediaDrag}
            onPointerCancel={endMediaDrag}
            style={{
              objectFit: mediaObjectFit,
              transform: mediaTransform,
              maxWidth:
                mediaFit === "original"
                  ? "none"
                  : "100%",
              maxHeight:
                mediaFit === "original"
                  ? "none"
                  : "100%",
            }}
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            className="editorMedia"
            alt="UTV preview"
            draggable={false}
            onPointerDown={beginMediaDrag}
            onPointerMove={moveMedia}
            onPointerUp={endMediaDrag}
            onPointerCancel={endMediaDrag}
            style={{
              objectFit: mediaObjectFit,
              transform: mediaTransform,
              maxWidth:
                mediaFit === "original"
                  ? "none"
                  : "100%",
              maxHeight:
                mediaFit === "original"
                  ? "none"
                  : "100%",
            }}
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
              touchAction: "none",
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
              beginStickerDrag(event, sticker)
            }
            onPointerMove={moveSticker}
            onPointerUp={endStickerDrag}
            onPointerCancel={endStickerDrag}
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              fontSize: `${sticker.size}px`,
              touchAction: "none",
            }}
          >
            {sticker.value}
          </div>
        ))}

        {(musicFile || musicUrl.trim()) && (
          <div className="musicBadge">
            <span>🎵</span>
            <strong>
              {musicTitle || "Story Music"}
            </strong>
          </div>
        )}
      </section>

      <section className="mediaFrameControls">
        <div className="fitModeRow">
          <button
            className={
              mediaFit === "contain"
                ? "fitModeButton activeFitMode"
                : "fitModeButton"
            }
            onClick={() => setMediaFit("contain")}
          >
            Fit
          </button>

          <button
            className={
              mediaFit === "cover"
                ? "fitModeButton activeFitMode"
                : "fitModeButton"
            }
            onClick={() => setMediaFit("cover")}
          >
            Fill
          </button>

          <button
            className={
              mediaFit === "original"
                ? "fitModeButton activeFitMode"
                : "fitModeButton"
            }
            onClick={() => setMediaFit("original")}
          >
            Original
          </button>

          <button
            className="resetFrameButton"
            onClick={resetMediaFrame}
          >
            Reset
          </button>
        </div>

        <div className="zoomControl">
          <span>−</span>

          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={mediaScale}
            onChange={(event) =>
              setMediaScale(
                Number(event.target.value)
              )
            }
            aria-label="Resize story media"
          />

          <span>+</span>
        </div>

        <div className="rotationControl">
          <span>↺</span>

          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={mediaRotation}
            onChange={(event) =>
              setMediaRotation(
                Number(event.target.value)
              )
            }
            aria-label="Rotate story media"
          />

          <span>↻</span>
        </div>

        <button
          type="button"
          className={
            blurBackground
              ? "blurToggle activeBlurToggle"
              : "blurToggle"
          }
          onClick={() =>
            setBlurBackground(
              (current) => !current
            )
          }
          disabled={
            !previewUrl ||
            previewIsVideo
          }
        >
          ✨ Blurred Background
        </button>

        <p className="mediaControlHint">
          Drag with one finger. Pinch with two
          fingers to resize and rotate.
        </p>
      </section>

      <section className="editorToolbar">
        <button
          className="toolButton"
          onClick={addTextLayer}
        >
          <strong>Aa</strong>
          <small>Text</small>
        </button>

        <label className="toolButton">
          <span>🎵</span>
          <small>Music</small>

          <input
            hidden
            type="file"
            accept="audio/*"
            onChange={chooseMusic}
          />
        </label>

        <button
          className="toolButton"
          onClick={() => addSticker("🔥")}
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

              <span>{selectedText.size}px</span>

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
              onClick={() => addSticker(sticker)}
            >
              {sticker}
            </button>
          ))}
        </div>

        {(musicFile || musicUrl.trim()) && (
          <div className="optionPanel">
            <input
              className="formField"
              placeholder="Song title"
              value={musicTitle}
              onChange={(event) =>
                setMusicTitle(event.target.value)
              }
            />

            <button
              className="removeMusicButton"
              onClick={removeMusic}
            >
              Remove Music
            </button>
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
            setCaption(event.target.value)
          }
        />

        {!isStory && (
          <>
            <input
              className="formField"
              placeholder="Title"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
            />

            <select
              className="formField"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              {categories.map((option) => (
                <option key={option}>{option}</option>
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
          </>
        )}

        <button
          className="shareButton"
          disabled={
            posting ||
            (!file && !linkUrl.trim())
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
          <p className="submitMessage">{message}</p>
        )}
      </section>
    </main>
  );
}
const styles = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    background: #000;
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
    opacity: 0.55;
  }

  .submitPage {
    min-height: 100vh;
    padding-bottom: 120px;
    overflow-x: hidden;
    color: white;
    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(82, 247, 200, 0.17),
        transparent 28%
      ),
      radial-gradient(
        circle at 90% 5%,
        rgba(123, 97, 255, 0.22),
        transparent 34%
      ),
      linear-gradient(
        180deg,
        #07111e,
        #000
      );
  }

  .createHero {
    display: flex;
    align-items: center;
    gap: 15px;
    margin: 15px;
    padding: 19px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.065);
    box-shadow:
      0 18px 45px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(18px);
  }

  .createLogo {
    width: 86px;
    height: 68px;
    flex: 0 0 auto;
    object-fit: contain;
  }

  .createHero p,
  .eyebrow {
    margin: 0 0 6px;
    color: #52f7c8;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .createHero h1,
  .linkPanel h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1;
    letter-spacing: -1px;
  }

  .createHero span {
    display: block;
    margin-top: 8px;
    color: rgba(255, 255, 255, 0.62);
    font-size: 13px;
    line-height: 1.4;
  }

  .mainCreateGrid {
    display: grid;
    gap: 11px;
    padding: 0 15px;
  }

  .mainCreateCard {
    width: 100%;
    min-height: 108px;
    display: flex;
    align-items: center;
    gap: 17px;
    padding: 18px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.065);
    box-shadow:
      0 15px 38px rgba(0, 0, 0, 0.23);
    transition:
      transform 0.16s ease,
      border-color 0.16s ease;
  }

  .mainCreateCard:active,
  .smallCreateCard:active {
    transform: scale(0.98);
  }

  .mainCreateCard > span {
    width: 60px;
    height: 60px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.28);
    font-size: 30px;
  }

  .mainCreateCard h2 {
    margin: 0 0 6px;
    font-size: 21px;
  }

  .mainCreateCard p {
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 13px;
    line-height: 1.35;
  }

  .storyCreateCard {
    background:
      linear-gradient(
        135deg,
        rgba(82, 247, 200, 0.19),
        rgba(123, 97, 255, 0.16)
      );
  }

  .feedCreateCard {
    background:
      linear-gradient(
        135deg,
        rgba(123, 97, 255, 0.22),
        rgba(255, 255, 255, 0.055)
      );
  }

  .liveCreateCard {
    background:
      linear-gradient(
        135deg,
        rgba(255, 72, 82, 0.22),
        rgba(123, 97, 255, 0.14)
      );
  }

  .moreCreateSection {
    padding: 25px 15px 0;
  }

  .sectionHeading {
    margin-bottom: 13px;
  }

  .sectionHeading h2 {
    margin: 0;
    font-size: 22px;
  }

  .sectionHeading span {
    display: block;
    margin-top: 5px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
  }

  .moreCreateGrid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 11px;
  }

  .smallCreateCard {
    min-height: 138px;
    padding: 15px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.055);
    transition: transform 0.16s ease;
  }

  .smallCreateCard > span {
    font-size: 28px;
  }

  .smallCreateCard h3 {
    margin: 10px 0 5px;
    font-size: 16px;
  }

  .smallCreateCard p {
    margin: 0;
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    line-height: 1.38;
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
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
  }

  .formField {
    width: 100%;
    padding: 15px 16px;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 18px;
    outline: none;
    background: rgba(255, 255, 255, 0.08);
  }

  .formField::placeholder {
    color: rgba(255, 255, 255, 0.46);
  }

  .formField:focus {
    border-color: rgba(82, 247, 200, 0.72);
    box-shadow:
      0 0 0 3px rgba(82, 247, 200, 0.08);
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
    grid-template-rows:
      auto
      minmax(0, 1fr)
      auto;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    color: white;
    background: #000;
  }

  .cameraHeader {
    position: relative;
    z-index: 30;
    min-height: 86px;
    display: grid;
    grid-template-columns:
      54px
      1fr
      54px;
    align-items: center;
    gap: 10px;
    padding:
      max(13px, env(safe-area-inset-top))
      16px
      11px;
    background:
      linear-gradient(
        180deg,
        #07111e,
        #020408
      );
    border-bottom:
      1px solid rgba(255, 255, 255, 0.08);
  }

  .cameraHeaderButton {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
    font-size: 26px;
  }

  .cameraBrand {
    display: grid;
    justify-items: center;
    line-height: 1;
  }

  .cameraBrand strong {
    color: #72ff98;
    font-size: 34px;
    font-weight: 1000;
    letter-spacing: -2px;
    text-shadow:
      0 0 18px rgba(82, 247, 200, 0.35);
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
        rgba(0, 0, 0, 0.03),
        transparent 18%,
        transparent 75%,
        rgba(0, 0, 0, 0.31)
      );
  }

  .cameraMessage {
    position: absolute;
    right: 18px;
    bottom: 18px;
    left: 18px;
    z-index: 15;
    padding: 12px;
    color: #52f7c8;
    text-align: center;
    border: 1px solid rgba(82, 247, 200, 0.23);
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.74);
    backdrop-filter: blur(14px);
  }

  .cameraControls {
    position: relative;
    z-index: 30;
    padding:
      16px
      12px
      max(16px, env(safe-area-inset-bottom));
    background:
      linear-gradient(
        180deg,
        #05070b,
        #000
      );
    border-top:
      1px solid rgba(255, 255, 255, 0.08);
  }

  .cameraModeRow {
    display: grid;
    grid-template-columns:
      minmax(44px, 1fr)
      minmax(44px, 1fr)
      90px
      minmax(44px, 1fr)
      minmax(44px, 1fr);
    align-items: center;
    gap: 6px;
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
    width: 82px;
    height: 82px;
    display: grid;
    place-items: center;
    padding: 7px;
    border: 5px solid #7b61ff;
    border-radius: 50%;
    background: transparent;
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.9),
      0 0 24px rgba(123, 97, 255, 0.42);
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
      transform: scale(0.94);
      box-shadow:
        0 0 0 3px rgba(255, 255, 255, 0.9),
        0 0 35px rgba(255, 77, 87, 0.72);
    }
  }

  .cameraQuickModes {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 12px;
  }

  .cameraQuickModes button {
    padding: 8px 13px;
    color: rgba(255, 255, 255, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.045);
    font-size: 12px;
    font-weight: 900;
  }

  .cameraQuickModes .activeQuickMode {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
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
    grid-template-columns:
      50px
      1fr
      72px;
    align-items: center;
    gap: 10px;
    padding:
      max(12px, env(safe-area-inset-top))
      14px
      12px;
    background: rgba(0, 0, 0, 0.86);
    border-bottom:
      1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px);
  }

  .editorHeader strong {
    text-align: center;
  }

  .circleButton,
  .shareTopButton {
    color: white;
    border:
      1px solid rgba(255, 255, 255, 0.16);
    background:
      rgba(255, 255, 255, 0.07);
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
    overflow: hidden;
    position: relative;
    width: 100%;
    height: min(67vh, 720px);
    min-height: 450px;
    overflow: hidden;
    background: #090909;
    touch-action: none;
  }

  .mediaBlurBackdrop {
    position: absolute;
    inset: -28px;
    z-index: 0;
    background-size: cover;
    background-position: center;
    filter: blur(24px);
    opacity: .72;
    transform: scale(1.12);
    pointer-events: none;
  }

  .editorMedia {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    object-position: center;
    background: #000;
    cursor: grab;
    user-select: none;
    touch-action: none;
    transition:
      object-fit .18s ease,
      transform .08s linear;
    transform-origin: center center;
    will-change: transform;
  }

  .editorMedia:active {
    cursor: grabbing;
  }

  .mediaFrameControls {
    width: 100%;
    padding: 12px 14px 10px;
    border-top:
      1px solid rgba(255,255,255,.08);
    border-bottom:
      1px solid rgba(255,255,255,.08);
    background:
      rgba(8,10,16,.96);
  }

  .fitModeRow {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr)) auto;
    gap: 8px;
  }

  .fitModeButton,
  .resetFrameButton {
    min-height: 38px;
    padding: 8px 10px;
    color: rgba(255,255,255,.72);
    border:
      1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    background:
      rgba(255,255,255,.055);
    font-size: 12px;
    font-weight: 900;
  }

  .activeFitMode {
    color: #06110d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #8b79ff
      );
  }

  .resetFrameButton {
    color: #ffd166;
  }

  .zoomControl {
    display: grid;
    grid-template-columns:
      28px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 8px;
    margin-top: 11px;
    color: white;
    text-align: center;
    font-weight: 900;
  }

  .zoomControl input {
    width: 100%;
    accent-color: #52f7c8;
  }

  .rotationControl {
    display: grid;
    grid-template-columns:
      28px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 8px;
    margin-top: 9px;
    color: white;
    text-align: center;
    font-weight: 900;
  }

  .rotationControl input {
    width: 100%;
    accent-color: #8b79ff;
  }

  .blurToggle {
    width: 100%;
    min-height: 40px;
    margin-top: 10px;
    color: rgba(255,255,255,.72);
    border:
      1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    background:
      rgba(255,255,255,.055);
    font-size: 12px;
    font-weight: 900;
  }

  .activeBlurToggle {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #8b79ff
      );
  }

  .blurToggle:disabled {
    opacity: .35;
  }

  .mediaControlHint {
    margin: 7px 0 0;
    color: rgba(255,255,255,.48);
    text-align: center;
    font-size: 10px;
  }

  .emptyPreview {
    height: 100%;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.5);
  }

  .textLayer,
  .stickerLayer {
    position: absolute;
    z-index: 20;
    transform:
      translate(-50%, -50%);
    user-select: none;
    touch-action: none;
    cursor: grab;
  }

  .textLayer:active,
  .stickerLayer:active {
    cursor: grabbing;
  }

  .textLayer {
    max-width: 88%;
    padding: 7px 11px;
    text-align: center;
    font-weight: 950;
    white-space: pre-wrap;
    text-shadow:
      0 3px 12px rgba(0, 0, 0, 0.95);
  }

  .selectedLayer {
    outline:
      2px dashed #52f7c8;
    outline-offset: 5px;
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
    overflow: hidden;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(14px);
  }

  .musicBadge strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editorToolbar {
    display: flex;
    justify-content: center;
    gap: 10px;
    overflow-x: auto;
    padding: 13px;
    background:
      linear-gradient(
        180deg,
        #050505,
        #101010
      );
  }

  .toolButton {
    min-width: 64px;
    display: grid;
    justify-items: center;
    gap: 4px;
    padding: 9px;
    color: white;
    border:
      1px solid rgba(255, 255, 255, 0.13);
    border-radius: 17px;
    background:
      rgba(255, 255, 255, 0.06);
  }

  .toolButton span,
  .toolButton strong {
    font-size: 22px;
  }

  .toolButton small {
    font-size: 10px;
  }

  .editorOptions {
    max-width: 680px;
    display: grid;
    gap: 13px;
    margin: 0 auto;
    padding: 15px 15px 110px;
    background:
      radial-gradient(
        circle at top,
        rgba(82, 247, 200, 0.08),
        transparent 28%
      ),
      linear-gradient(
        180deg,
        #10141c,
        #020304
      );
  }

  .optionPanel,
  .destinationPanel {
    display: grid;
    gap: 12px;
    padding: 14px;
    border:
      1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    background:
      rgba(255, 255, 255, 0.055);
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
    padding: 0;
    border:
      2px solid rgba(255, 255, 255, 0.72);
    border-radius: 50%;
  }

  .selectedColor {
    outline:
      3px solid #52f7c8;
    outline-offset: 3px;
  }

  .sizeRow button {
    padding: 8px 12px;
    color: white;
    border:
      1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    background:
      rgba(255, 255, 255, 0.07);
  }

  .stickerTray {
    display: flex;
    gap: 9px;
    overflow-x: auto;
    padding: 2px 0 5px;
  }

  .stickerTray::-webkit-scrollbar {
    display: none;
  }

  .stickerTray button {
    flex: 0 0 auto;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    padding: 0;
    font-size: 24px;
    border:
      1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    background:
      rgba(255, 255, 255, 0.06);
  }

  .removeMusicButton {
    padding: 12px;
    color: white;
    border:
      1px solid rgba(255, 77, 87, 0.42);
    border-radius: 16px;
    background:
      rgba(255, 77, 87, 0.12);
  }

  .destinationPanel h3 {
    margin: 0;
  }

  .destinationGrid {
    display: grid;
    grid-template-columns:
      repeat(3, 1fr);
    gap: 8px;
  }

  .destinationButton {
    padding: 12px 8px;
    color:
      rgba(255, 255, 255, 0.72);
    border:
      1px solid rgba(255, 255, 255, 0.12);
    border-radius: 15px;
    background:
      rgba(0, 0, 0, 0.25);
    font-weight: 850;
  }

  .activeDestination {
    color: #06120d;
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .worldFields {
    display: grid;
    gap: 10px;
  }

  .twoFields {
    display: grid;
    grid-template-columns:
      1fr 1fr;
    gap: 9px;
  }

  .shareButton,
  .cancelButton {
    width: 100%;
    padding: 16px;
    border-radius: 18px;
    font-size: 16px;
    font-weight: 950;
  }

  .shareButton {
    color: #06120d;
    border: 0;
    background:
      linear-gradient(
        135deg,
        #52f7c8,
        #7b61ff
      );
  }

  .cancelButton {
    color: white;
    border:
      1px solid rgba(255, 255, 255, 0.14);
    background:
      rgba(255, 255, 255, 0.07);
  }

  .submitMessage {
    margin: 0;
    padding: 13px;
    color: #52f7c8;
    text-align: center;
    border:
      1px solid rgba(82, 247, 200, 0.18);
    border-radius: 16px;
    background:
      rgba(82, 247, 200, 0.08);
    font-weight: 850;
  }

  @media (min-width: 760px) {
    .createHero,
    .mainCreateGrid,
    .moreCreateSection {
      max-width: 920px;
      margin-right: auto;
      margin-left: auto;
    }

    .mainCreateGrid {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }

    .mainCreateCard {
      min-height: 175px;
      display: grid;
      align-content: center;
    }

    .moreCreateGrid {
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
    }

    .editorCanvas,
    .editorToolbar,
    .mediaFrameControls {
      max-width: 620px;
      margin-right: auto;
      margin-left: auto;
    }
  }

  @media (max-width: 390px) {
    .createLogo {
      width: 72px;
    }

    .createHero h1 {
      font-size: 26px;
    }

    .mainCreateCard {
      padding: 15px;
    }

    .cameraModeRow {
      grid-template-columns:
        minmax(38px, 1fr)
        minmax(38px, 1fr)
        78px
        minmax(38px, 1fr)
        minmax(38px, 1fr);
    }

    .mainCaptureButton {
      width: 72px;
      height: 72px;
    }

    .cameraModeButton span {
      font-size: 24px;
    }

    .cameraModeButton small {
      font-size: 10px;
    }
  }
`;