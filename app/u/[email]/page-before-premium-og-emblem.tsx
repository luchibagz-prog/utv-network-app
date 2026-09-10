"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

type Tab = "posts" | "featured" | "crew" | "about";

function pick(row: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value) return String(value);
  }

  return fallback;
}

export default function PublicProfile() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = decodeURIComponent(String(params.email || ""));
  const preview = searchParams.get("preview") === "1";

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [profile, setProfile] = useState<any>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [creatorDashboardOpen, setCreatorDashboardOpen] =
    useState(false);
  const [tabTouchStart, setTabTouchStart] = useState<number | null>(null);
  const [tabTouchEnd, setTabTouchEnd] = useState<number | null>(null);
  const [crew, setCrew] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tab, setTab] = useState<Tab>("posts");
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const [utvBadge, setUtvBadge] = useState<{
    og_number: number | null;
    is_ceo: boolean;
  } | null>(null);

  const [ogSpotsRemaining, setOgSpotsRemaining] =
    useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [socialSheet, setSocialSheet] =
    useState<"followers" | "following" | null>(null);

  const [socialUsers, setSocialUsers] =
    useState<any[]>([]);

  const [socialLoading, setSocialLoading] =
    useState(false);

  const [viewerEmail, setViewerEmail] =
    useState("");

  const [isFollowingProfile, setIsFollowingProfile] =
    useState(false);

  const [followBusy, setFollowBusy] =
    useState(false);

  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);

  const [isBlocked, setIsBlocked] =
    useState(false);

  const [blockBusy, setBlockBusy] =
    useState(false);


  useEffect(() => {
    void load();
  }, [email]);

  async function toggleProfileFollow() {
    if (
      followBusy ||
      isOwner ||
      !viewerEmail ||
      isBlocked
    ) {
      return;
    }

    setFollowBusy(true);

    try {
      const targetEmail =
        email.toLowerCase();

      if (isFollowingProfile) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_email", viewerEmail)
          .eq("following_email", targetEmail);

        if (error) throw error;

        setIsFollowingProfile(false);

        setFollowers((current) =>
          Math.max(0, current - 1)
        );
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_email: viewerEmail,
            following_email: targetEmail,
          });

        if (error) throw error;

        setIsFollowingProfile(true);

        setFollowers((current) =>
          current + 1
        );
      }
    } catch (error) {
      console.error(
        "UTV follow update failed:",
        error
      );
    } finally {
      setFollowBusy(false);
    }
  }

  async function toggleProfileBlock() {
    if (
      blockBusy ||
      isOwner ||
      !viewerEmail
    ) {
      return;
    }

    const targetEmail =
      email.toLowerCase();

    setBlockBusy(true);

    try {
      if (isBlocked) {
        const { error } = await supabase
          .from("blocks")
          .delete()
          .eq("blocker_email", viewerEmail)
          .eq("blocked_email", targetEmail);

        if (error) throw error;

        setIsBlocked(false);
        setProfileMenuOpen(false);

        return;
      }

      const wasFollowing =
        isFollowingProfile;

      const { error } = await supabase
        .from("blocks")
        .insert({
          blocker_email: viewerEmail,
          blocked_email: targetEmail,
        });

      if (error) throw error;

      await Promise.all([
        supabase
          .from("follows")
          .delete()
          .eq("follower_email", viewerEmail)
          .eq("following_email", targetEmail),

        supabase
          .from("follows")
          .delete()
          .eq("follower_email", targetEmail)
          .eq("following_email", viewerEmail),
      ]);

      if (wasFollowing) {
        setFollowers((current) =>
          Math.max(0, current - 1)
        );
      }

      setIsFollowingProfile(false);
      setIsBlocked(true);
      setProfileMenuOpen(false);
    } catch (error) {
      console.error(
        "UTV block update failed:",
        error
      );
    } finally {
      setBlockBusy(false);
    }
  }

  async function load() {
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();

      const viewer =
        auth.user?.email?.toLowerCase() || "";

      const targetEmail =
        email.toLowerCase();

      const owner =
        !!viewer &&
        viewer === targetEmail;

      setViewerEmail(viewer);
      setIsOwner(owner);

      if (viewer && !owner) {
        const [
          followRelationship,
          blockRelationship,
        ] = await Promise.all([
          supabase
            .from("follows")
            .select("follower_email,following_email")
            .eq("follower_email", viewer)
            .eq("following_email", targetEmail)
            .maybeSingle(),

          supabase
            .from("blocks")
            .select("blocker_email,blocked_email")
            .eq("blocker_email", viewer)
            .eq("blocked_email", targetEmail)
            .maybeSingle(),
        ]);

        setIsFollowingProfile(
          Boolean(followRelationship.data)
        );

        setIsBlocked(
          Boolean(blockRelationship.data)
        );
      } else {
        setIsFollowingProfile(false);
        setIsBlocked(false);
      }

      const [
        profileResult,
        postsResult,
        topCrewResult,
        followerResult,
        followingResult,
        badgeResult,
        ogRemainingResult,
      ] = await Promise.all([
        supabase
          .from("creator_profiles")
          .select("*")
          .eq("email", email)
          .maybeSingle(),

        supabase
          .from("uploads")
          .select("*")
          .eq("creator_email", email)
          .order("created_at", { ascending: false })
          .limit(30),

        supabase
          .from("top_crew")
          .select("member_email,position")
          .eq("owner_email", email)
          .order("position", { ascending: true })
          .limit(8),

        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_email", email),

        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_email", email),

        supabase.rpc("get_utv_badge", {
          target_email: email,
        }),

        supabase.rpc("get_utv_og_spots_remaining"),
      ]);

      setProfile(profileResult.data || {});
      setPosts(postsResult.data || []);
      setFollowers(followerResult.count || 0);
      setFollowing(followingResult.count || 0);

      const badgeRows = Array.isArray(badgeResult.data)
        ? badgeResult.data
        : [];

      const badgeRow = badgeRows[0] || null;

      setUtvBadge(
        badgeRow
          ? {
              og_number:
                badgeRow.og_number == null
                  ? null
                  : Number(badgeRow.og_number),
              is_ceo: Boolean(badgeRow.is_ceo),
            }
          : null
      );

      const remainingValue =
        typeof ogRemainingResult.data === "number"
          ? ogRemainingResult.data
          : Number(ogRemainingResult.data);

      setOgSpotsRemaining(
        Number.isFinite(remainingValue)
          ? Math.max(0, remainingValue)
          : null
      );

      const topRows = topCrewResult.data || [];

      const crewEmails = topRows
        .map((row: any) => String(row.member_email || ""))
        .filter(Boolean);

      if (!crewEmails.length) {
        setCrew([]);
        return;
      }

      const { data: crewProfiles } = await supabase
        .from("creator_profiles")
        .select("*")
        .in("email", crewEmails);

      const profileMap = new Map(
        (crewProfiles || []).map((member: any) => [
          String(member.email || "").toLowerCase(),
          member,
        ])
      );

      const orderedCrew = crewEmails.map((crewEmail: string) => {
        const member =
          profileMap.get(crewEmail.toLowerCase()) || {};

        return {
          email: crewEmail,

          name: pick(
            member,
            [
              "display_name",
              "creator_name",
              "full_name",
              "username",
            ],
            crewEmail.split("@")[0]
          ),

          username: pick(
            member,
            ["username"],
            crewEmail.split("@")[0]
          ),

          avatar: pick(member, [
            "avatar_url",
            "creator_avatar",
            "profile_image",
            "image_url",
          ]),
        };
      });

      setCrew(orderedCrew);
    } catch (error: any) {
      console.error(error);
      setNotice(error?.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  const name = pick(
    profile,
    ["display_name", "creator_name", "full_name", "username"],
    email.split("@")[0] || "UTV Creator"
  );

  const username = pick(
    profile,
    ["username"],
    email.split("@")[0] || "creator"
  );

  const avatar = pick(profile, [
    "avatar_url",
    "creator_avatar",
    "profile_image",
    "image_url",
  ]);

  const cover = pick(
    profile,
    [
      "profile_background_url",
      "profile_background",
      "cover_url",
      "banner_url",
    ],
    "/utv-banner.png"
  );

  const bio = pick(
    profile,
    ["bio", "description"],
    "The culture streams here."
  );

  const category = pick(
    profile,
    ["category", "creator_type"],
    "UTV Creator"
  );

  const song = pick(profile, [
    "profile_song_url",
    "profile_song",
    "music_url",
  ]);

  const songTitle = pick(
    profile,
    ["profile_song_title", "music_title", "song_title"],
    song ? "Profile Soundtrack" : ""
  );

  const songArtist = pick(
    profile,
    [
      "profile_song_artist",
      "music_artist",
      "song_artist",
    ],
    name
  );

  const featured = useMemo(
    () => posts.slice(0, 3),
    [posts]
  );

  const profileTabs: Tab[] = [
    "posts",
    "featured",
    
    "about",
  ];

  function moveProfileTab(direction: "next" | "prev") {
    const currentIndex = profileTabs.indexOf(tab);

    if (currentIndex < 0) return;

    const nextIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, profileTabs.length - 1)
        : Math.max(currentIndex - 1, 0);

    if (nextIndex !== currentIndex) {
      setTab(profileTabs[nextIndex]);

      try {
        navigator.vibrate?.(12);
      } catch {}
    }
  }

  function finishProfileSwipe() {
    if (
      tabTouchStart === null ||
      tabTouchEnd === null
    ) {
      setTabTouchStart(null);
      setTabTouchEnd(null);
      return;
    }

    const distance =
      tabTouchStart - tabTouchEnd;

    const minimumSwipe = 48;

    if (distance > minimumSwipe) {
      moveProfileTab("next");
    } else if (distance < -minimumSwipe) {
      moveProfileTab("prev");
    }

    setTabTouchStart(null);
    setTabTouchEnd(null);
  }

  useEffect(() => {
    if (!song || !audioRef.current) return;

    const audio = audioRef.current;

    async function attemptProfileAutoplay() {
      try {
        audio.volume = 0.75;
        await audio.play();
        setPlaying(true);
        setAutoplayBlocked(false);
      } catch {
        // Most phones block sound-on autoplay until interaction.
        setPlaying(false);
        setAutoplayBlocked(true);
      }
    }

    const timer = window.setTimeout(() => {
      void attemptProfileAutoplay();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [song]);


  async function openSocialList(
    kind: "followers" | "following"
  ) {
    setSocialSheet(kind);
    setSocialLoading(true);
    setSocialUsers([]);

    try {
      const query =
        kind === "followers"
          ? supabase
              .from("follows")
              .select("follower_email")
              .eq("following_email", email)
          : supabase
              .from("follows")
              .select("following_email")
              .eq("follower_email", email);

      const { data, error } = await query;

      if (error) throw error;

      const emails = Array.from(
        new Set(
          (data || [])
            .map((row: any) =>
              String(
                kind === "followers"
                  ? row.follower_email
                  : row.following_email
              )
            )
            .filter(Boolean)
        )
      );

      if (!emails.length) {
        setSocialUsers([]);
        return;
      }

      const { data: profiles, error: profileError } =
        await supabase
          .from("creator_profiles")
          .select("*")
          .in("email", emails);

      if (profileError) throw profileError;

      const profileMap = new Map(
        (profiles || []).map((person: any) => [
          String(person.email || "").toLowerCase(),
          person,
        ])
      );

      const ordered = emails.map((personEmail) => {
        const person =
          profileMap.get(personEmail.toLowerCase()) || {};

        return {
          email: personEmail,

          name: pick(
            person,
            [
              "display_name",
              "creator_name",
              "username",
            ],
            "UTV Creator"
          ),

          username: pick(
            person,
            ["username"],
            "creator"
          ),

          avatar: pick(
            person,
            [
              "avatar_url",
              "creator_avatar",
              "profile_image",
            ]
          ),

          category: pick(
            person,
            ["category", "creator_type"],
            "Creator"
          ),
        };
      });

      setSocialUsers(ordered);
    } catch (error) {
      console.error(
        "Could not load social list:",
        error
      );

      setNotice(
        "Could not load this list right now."
      );

      window.setTimeout(
        () => setNotice(""),
        1800
      );
    } finally {
      setSocialLoading(false);
    }
  }

  function jumpToProfileTab(
    nextTab: Tab
  ) {
    setTab(nextTab);

    window.setTimeout(() => {
      document
        .querySelector(".tabs")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 60);
  }

  async function toggleMusic() {
    if (!song || !audioRef.current) {
      setNotice("This creator has not added a profile song yet.");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setPlaying(true);
        setAutoplayBlocked(false);
      } else {
        audioRef.current.pause();
        setPlaying(false);
      }
    } catch {
      setNotice("Tap again to start the music.");
      window.setTimeout(() => setNotice(""), 1800);
    }
  }

  if (loading) {
    return (
      <main className="utvLoadingPage">
        <UTVNav />

        <div className="loaderAtmosphere loaderAtmosphereOne" />
        <div className="loaderAtmosphere loaderAtmosphereTwo" />

        <section className="utvLoader" aria-label="Loading profile">
          <div className="utvMark">
            <div className="utvMarkGlow" />
            <span className="utvLetters">UTV</span>
          </div>

          <div className="utvLoaderLine">
            <span />
          </div>

          <div className="utvLoadingCopy">
            <strong>Loading profile</strong>
            <span>Opening UTV</span>
          </div>
        </section>

        <style jsx>{`
          .utvLoadingPage {
            position: relative;
            min-height: 100svh;
            overflow: hidden;
            display: grid;
            place-items: center;
            color: #fff;
            background:
              radial-gradient(
                circle at 50% 38%,
                rgba(82, 247, 200, 0.075),
                transparent 24%
              ),
              radial-gradient(
                circle at 70% 58%,
                rgba(123, 97, 255, 0.08),
                transparent 30%
              ),
              linear-gradient(
                180deg,
                #020408 0%,
                #050812 48%,
                #020409 100%
              );
          }

          .loaderAtmosphere {
            position: absolute;
            pointer-events: none;
            border-radius: 999px;
            filter: blur(70px);
            opacity: 0.22;
            animation: loaderFloat 5s ease-in-out infinite alternate;
          }

          .loaderAtmosphereOne {
            width: 210px;
            height: 210px;
            background: rgba(82, 247, 200, 0.32);
            top: 24%;
            left: calc(50% - 150px);
          }

          .loaderAtmosphereTwo {
            width: 230px;
            height: 230px;
            background: rgba(123, 97, 255, 0.26);
            bottom: 24%;
            right: calc(50% - 160px);
            animation-delay: -2.2s;
          }

          .utvLoader {
            position: relative;
            z-index: 2;
            width: min(78vw, 270px);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .utvMark {
            position: relative;
            height: 88px;
            min-width: 150px;
            display: grid;
            place-items: center;
            margin-bottom: 25px;
            background: transparent;
          }

          .utvMarkGlow {
            position: absolute;
            width: 112px;
            height: 112px;
            border-radius: 50%;
            background:
              radial-gradient(
                circle,
                rgba(82, 247, 200, 0.19),
                rgba(123, 97, 255, 0.08) 46%,
                transparent 70%
              );
            filter: blur(3px);
            animation: logoGlow 1.8s ease-in-out infinite alternate;
          }

          .utvLetters {
            position: relative;
            z-index: 1;
            font-size: 44px;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -3px;
            color: #fff;
            text-shadow:
              0 0 24px rgba(82, 247, 200, 0.20),
              0 0 42px rgba(123, 97, 255, 0.12);
          }

          .utvLoaderLine {
            width: 128px;
            height: 3px;
            border-radius: 999px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.09);
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.025);
          }

          .utvLoaderLine span {
            display: block;
            width: 42%;
            height: 100%;
            border-radius: inherit;
            background:
              linear-gradient(
                90deg,
                #52f7c8,
                #a985ff
              );
            box-shadow: 0 0 14px rgba(82, 247, 200, 0.45);
            animation: loadingSweep 1.15s ease-in-out infinite;
          }

          .utvLoadingCopy {
            margin-top: 17px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .utvLoadingCopy strong {
            font-size: 15px;
            font-weight: 760;
            letter-spacing: -0.15px;
          }

          .utvLoadingCopy span {
            color: rgba(255,255,255,.43);
            font-size: 11px;
            font-weight: 650;
            letter-spacing: 1.25px;
            text-transform: uppercase;
          }

          @keyframes loadingSweep {
            0% {
              transform: translateX(-120%);
            }

            55%,
            100% {
              transform: translateX(245%);
            }
          }

          @keyframes logoGlow {
            from {
              opacity: .52;
              transform: scale(.92);
            }

            to {
              opacity: 1;
              transform: scale(1.08);
            }
          }

          @keyframes loaderFloat {
            from {
              transform: translate3d(-8px, -5px, 0) scale(.96);
            }

            to {
              transform: translate3d(8px, 8px, 0) scale(1.05);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .utvLoaderLine span,
            .utvMarkGlow,
            .loaderAtmosphere {
              animation: none;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <UTVNav />

      {song && (
        <audio
          ref={audioRef}
          src={song}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

<section
        className="hero"
        style={{
          backgroundImage:
            `linear-gradient(180deg,rgba(0,0,0,.05),rgba(4,7,14,.34) 48%,#050812 96%),url("${cover}")`,
        }}
      >
        <div
          className="identity"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-start",
          }}
        >
          <div className="avatar">
            {avatar ? (
              <img src={avatar} alt={name} />
            ) : (
              <span>{name.slice(0, 1)}</span>
            )}
          </div>

          <div
            className="identityText"
            style={{
              position: "relative",
              zIndex: 4,
              marginTop: "8px",
              marginLeft: "2px",
              transform: "none",
              textAlign: "left",
              maxWidth: "240px",
            }}
          >
            <p className="category">{category}</p>
            <h1>{name}</h1>
            <b className="username">@{username}</b>
            {utvBadge && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "10px",
                  marginBottom: "4px",
                }}
              >
                {utvBadge.is_ceo && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      minHeight: "28px",
                      padding: "6px 11px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,211,92,.58)",
                      color: "#fff4bc",
                      background:
                        "linear-gradient(135deg, rgba(157,101,16,.96), rgba(48,29,5,.97))",
                      boxShadow:
                        "0 6px 20px rgba(255,177,30,.18), inset 0 1px 0 rgba(255,255,255,.18)",
                      fontSize: "10px",
                      fontWeight: 900,
                      letterSpacing: ".7px",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        color: "#ffd76a",
                        fontSize: "13px",
                        textShadow:
                          "0 0 10px rgba(255,207,78,.65)",
                      }}
                    >
                      ♛
                    </span>

                    CEO
                  </span>
                )}

                {utvBadge.og_number &&
                  utvBadge.og_number >= 1 &&
                  utvBadge.og_number <= 100 && (
                    <span
                      aria-label={`UTV OG #${String(
                        utvBadge.og_number
                      ).padStart(3, "0")}`}
                      title={`UTV Original 100 Member #${String(
                        utvBadge.og_number
                      ).padStart(3, "0")}`}
                      style={{
                        position: "relative",
                        width: "62px",
                        height: "68px",
                        flex: "0 0 62px",
                        display: "inline-grid",
                        placeItems: "center",
                        marginLeft: "2px",
                        verticalAlign: "middle",
                        filter:
                          "drop-shadow(0 9px 8px rgba(0,0,0,.7)) drop-shadow(0 0 8px rgba(255,193,45,.38))",
                      }}
                    >
                      {/* metallic outer shield */}
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          clipPath:
                            "polygon(50% 0%,88% 9%,100% 27%,92% 66%,77% 84%,50% 100%,23% 84%,8% 66%,0% 27%,12% 9%)",
                          background:
                            "linear-gradient(135deg,#fff2a3 0%,#c68810 14%,#ffe27a 28%,#704000 45%,#f3bc38 66%,#603600 82%,#ffd966 100%)",
                          boxShadow:
                            "inset 0 2px 2px rgba(255,255,255,.95), inset 0 -9px 13px rgba(55,28,0,.75)",
                        }}
                      >
                        {/* black inner shield */}
                        <span
                          style={{
                            position: "relative",
                            width: "53px",
                            height: "59px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            clipPath:
                              "polygon(50% 0%,87% 11%,95% 29%,86% 61%,72% 78%,50% 94%,28% 78%,14% 61%,5% 29%,13% 11%)",
                            background:
                              "radial-gradient(circle at 30% 17%,rgba(255,218,95,.22),transparent 26%), linear-gradient(155deg,#21190a 0%,#050505 39%,#100b02 68%,#000 100%)",
                            border:
                              "1px solid rgba(255,215,101,.48)",
                            boxShadow:
                              "inset 0 0 10px rgba(255,194,44,.15), inset 0 -12px 15px rgba(0,0,0,.88)",
                          }}
                        >
                                                    {/* premium UTV crown */}
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 32 18"
                            width="22"
                            height="14"
                            style={{
                              position: "absolute",
                              top: "4px",
                              left: "50%",
                              transform: "translateX(-50%)",
                              overflow: "visible",
                              filter:
                                "drop-shadow(0 2px 1px rgba(0,0,0,.9)) drop-shadow(0 0 3px rgba(255,195,36,.55))",
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="utv-og-crown-gold"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="1"
                              >
                                <stop offset="0%" stopColor="#fff6b7" />
                                <stop offset="27%" stopColor="#ffd354" />
                                <stop offset="58%" stopColor="#b87508" />
                                <stop offset="82%" stopColor="#f2bd35" />
                                <stop offset="100%" stopColor="#714000" />
                              </linearGradient>
                            </defs>

                            <path
                              d="M2 4.5 L9.2 9.2 L15.9 1.8 L22.8 9.2 L30 4.5 L27.2 15.7 H4.8 Z"
                              fill="url(#utv-og-crown-gold)"
                              stroke="#ffe786"
                              strokeWidth="1.1"
                              strokeLinejoin="round"
                            />

                            <path
                              d="M6 13.2 H26"
                              stroke="rgba(255,245,174,.85)"
                              strokeWidth="1"
                              strokeLinecap="round"
                            />

                            <circle cx="2" cy="4.2" r="1.5" fill="#ffe16c" />
                            <circle cx="16" cy="1.7" r="1.5" fill="#fff0a0" />
                            <circle cx="30" cy="4.2" r="1.5" fill="#ffe16c" />
                          </svg>

                          <span
                            style={{
                              marginTop: "10px",
                              color: "#f4ca4e",
                              fontSize: "9px",
                              lineHeight: 1,
                              fontWeight: 950,
                              letterSpacing: ".4px",
                              textShadow:
                                "0 1px 0 #fff0a1,0 2px 2px #000",
                            }}
                          >
                            UTV
                          </span>

                          <span
                            style={{
                              marginTop: "2px",
                              color: "#ffd34f",
                              fontSize: "20px",
                              lineHeight: ".92",
                              fontWeight: 1000,
                              letterSpacing: "-2px",
                              textShadow:
                                "0 1px 0 #fff0a1,0 3px 1px #714200,0 0 7px rgba(255,190,24,.65)",
                            }}
                          >
                            OG
                          </span>

                          <span
                            style={{
                              marginTop: "4px",
                              color: "#ffe9a6",
                              fontSize: "7px",
                              lineHeight: 1,
                              fontWeight: 950,
                              letterSpacing: ".8px",
                              textShadow: "0 1px 2px #000",
                            }}
                          >
                            #{String(
                              utvBadge.og_number
                            ).padStart(3, "0")}
                          </span>

                          {/* metallic shine */}
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              top: "7px",
                              left: "13px",
                              width: "20px",
                              height: "4px",
                              borderRadius: "999px",
                              transform: "rotate(-27deg)",
                              background:
                                "linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent)",
                              opacity: .75,
                            }}
                          />
                        </span>
                      </span>
                    </span>
                  )}
              </div>
            )}

<p className="bio">{bio}</p>
          </div>
        </div>

        {!isOwner && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 14px 8px",
              position: "relative",
              zIndex: 30,
            }}
          >
            <button
              type="button"
              disabled={
                followBusy ||
                isBlocked ||
                !viewerEmail
              }
              onClick={() => {
                void toggleProfileFollow();
              }}
              style={{
                flex: 1,
                height: "42px",
                border:
                  isFollowingProfile
                    ? "1px solid rgba(255,255,255,.12)"
                    : "1px solid rgba(82,247,200,.28)",
                borderRadius: "14px",
                background:
                  isBlocked
                    ? "rgba(255,255,255,.04)"
                    : isFollowingProfile
                      ? "rgba(255,255,255,.065)"
                      : "linear-gradient(135deg,#56f6cf,#48e6bd)",
                color:
                  isFollowingProfile ||
                  isBlocked
                    ? "#fff"
                    : "#04110d",
                fontSize: "13px",
                fontWeight: 950,
                cursor:
                  isBlocked
                    ? "default"
                    : "pointer",
                opacity:
                  followBusy ? 0.65 : 1,
              }}
            >
              {isBlocked
                ? "Blocked"
                : followBusy
                  ? "..."
                  : isFollowingProfile
                    ? "✓ Following"
                    : "+ Follow"}
            </button>

            <div
              style={{
                position: "relative",
              }}
            >
              <button
                type="button"
                aria-label="Profile options"
                onClick={() =>
                  setProfileMenuOpen(
                    (current) => !current
                  )
                }
                style={{
                  width: "42px",
                  height: "42px",
                  border:
                    "1px solid rgba(255,255,255,.10)",
                  borderRadius: "14px",
                  background:
                    "rgba(255,255,255,.045)",
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                •••
              </button>

              {profileMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "48px",
                    right: 0,
                    width: "170px",
                    padding: "6px",
                    border:
                      "1px solid rgba(255,255,255,.10)",
                    borderRadius: "15px",
                    background:
                      "rgba(10,13,17,.98)",
                    boxShadow:
                      "0 18px 45px rgba(0,0,0,.48)",
                    backdropFilter:
                      "blur(18px)",
                    WebkitBackdropFilter:
                      "blur(18px)",
                    zIndex: 100,
                  }}
                >
                  <button
                    type="button"
                    disabled={blockBusy}
                    onClick={() => {
                      void toggleProfileBlock();
                    }}
                    style={{
                      width: "100%",
                      minHeight: "40px",
                      border: 0,
                      borderRadius: "10px",
                      background:
                        isBlocked
                          ? "rgba(82,247,200,.08)"
                          : "rgba(255,66,85,.08)",
                      color:
                        isBlocked
                          ? "#72f7d3"
                          : "#ff7584",
                      fontSize: "12px",
                      fontWeight: 900,
                      textAlign: "left",
                      padding: "0 12px",
                      cursor: "pointer",
                    }}
                  >
                    {blockBusy
                      ? "Updating..."
                      : isBlocked
                        ? "Unblock user"
                        : "Block user"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!isOwner ? (
          !isBlocked ? (
          <div className="socialActions">
            <button
              className="messageAction"
              onClick={() =>
                router.push(
                  `/messages?to=${encodeURIComponent(email)}`
                )
              }
            >
              💬 Message
            </button>

            <button
              className="walkieAction"
              onClick={() =>
                router.push(
                  `/walkie?to=${encodeURIComponent(email)}`
                )
              }
            >
              <span className="walkiePulse" />
              🎙 Walkie
            </button>

            <button
              className="contactAction"
              onClick={() => setContactOpen(true)}
            >
              ⚡ Contact
            </button>
          </div>
          ) : (
            <div
              style={{
                margin: "0 14px 10px",
                padding: "10px 12px",
                border:
                  "1px solid rgba(255,255,255,.07)",
                borderRadius: "13px",
                background:
                  "rgba(255,255,255,.025)",
                color:
                  "rgba(255,255,255,.48)",
                fontSize: "11px",
                fontWeight: 750,
                textAlign: "center",
              }}
            >
              This user is blocked.
            </div>
          )
        ) : (
          <div className="socialActions ownerSocialActions">
            <button
              className="messageAction"
              onClick={() => router.push("/messages")}
            >
              💬 Messages
            </button>

            <button
              className="walkieAction"
              onClick={() => router.push("/walkie")}
            >
              <span className="walkiePulse" />
              🎙 Walkie
            </button>

            <button
              className="contactAction"
              onClick={() => router.push("/bookings")}
            >
              📅 Bookings
            </button>

            <button
              className={
                creatorDashboardOpen
                  ? "ownerCreatorButton open"
                  : "ownerCreatorButton"
              }
              onClick={() =>
                setCreatorDashboardOpen(
                  (current) => !current
                )
              }
            >
              <span>⚡</span>
              <strong>Creator</strong>
              <b>
                {creatorDashboardOpen ? "⌃" : "⌄"}
              </b>
            </button>
          </div>
        )}
      </section>


      {isOwner && (
        <section
          className={
            creatorDashboardOpen
              ? "creatorDashboard open"
              : "creatorDashboard"
          }
        >
          <div className="dashboardHeader">
            <div>
              <p>YOUR UTV</p>
              <h2>Creator Dashboard</h2>
              <span>
                Create, manage and grow without leaving your profile.
              </span>
            </div>

            <button
              onClick={() =>
                setCreatorDashboardOpen(false)
              }
              aria-label="Close creator dashboard"
            >
              ×
            </button>
          </div>

          <div className="creatorQuickActions">
            <button
              className="creatorPrimary"
              onClick={() =>
                router.push("/submit")
              }
            >
              <span>＋</span>
              <div>
                <strong>Create</strong>
                <small>Post, reel or story</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/profile-edit")
              }
            >
              <span>✎</span>
              <div>
                <strong>Edit Profile</strong>
                <small>Photo, bio & music</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/studio")
              }
            >
              <span>🎬</span>
              <div>
                <strong>Creator Studio</strong>
                <small>Manage your content</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/bookings")
              }
            >
              <span>📅</span>
              <div>
                <strong>Bookings</strong>
                <small>Requests & opportunities</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/calls")
              }
            >
              <span>📞</span>
              <div>
                <strong>Calls</strong>
                <small>Audio & video</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/top-crew")
              }
            >
              <span>8</span>
              <div>
                <strong>Top 8</strong>
                <small>Build your inner circle</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/activity")
              }
            >
              <span>♢</span>
              <div>
                <strong>Activity</strong>
                <small>Notifications & updates</small>
              </div>
            </button>

            <button
              onClick={() =>
                router.push("/settings")
              }
            >
              <span>⚙</span>
              <div>
                <strong>Settings</strong>
                <small>Account & notifications</small>
              </div>
            </button>
          </div>
        </section>
      )}

      {song && (
        <section className="profileMusicBar">
          <button
            className={playing ? "musicPlayButton playing" : "musicPlayButton"}
            onClick={() => void toggleMusic()}
            aria-label={playing ? "Pause soundtrack" : "Play soundtrack"}
          >
            {playing ? "❚❚" : "▶"}
          </button>

          <div className="profileMusicInfo">
            <span>NOW PLAYING</span>
            <strong>{songTitle || "Profile Soundtrack"}</strong>
            <small>{songArtist || `@${username}`}</small>
          </div>

          <div className={playing ? "musicBars active" : "musicBars"}>
            <i />
            <i />
            <i />
            <i />
          </div>
        </section>
      )}


      <section className="stats socialStats">
        <button
          onClick={() =>
            jumpToProfileTab("posts")
          }
        >
          <strong>{posts.length}</strong>
          <span>Posts</span>
        </button>

        <button
          onClick={() =>
            void openSocialList("followers")
          }
        >
          <strong>{followers}</strong>
          <span>Followers</span>
        </button>

        <button
          onClick={() =>
            void openSocialList("following")
          }
        >
          <strong>{following}</strong>
          <span>Following</span>
        </button>

        <button
          onClick={() =>
            jumpToProfileTab("crew")
          }
        >
          <strong>{crew.length}/8</strong>
          <span>Top 8</span>
        </button>
      </section>


      <section className="top8Spotlight">
        <div className="top8Heading">
          <div>
            <p>UTV INNER CIRCLE</p>
            <h2>Top 8</h2>
          </div>

          <button onClick={() => setTab("crew")}>
            View all
          </button>
        </div>

        <CrewGrid crew={crew.slice(0, 8)} router={router} />
      </section>

      <nav className="tabs">
        {(
          [
            ["posts", "Posts"],
            ["featured", "Featured"],

            ["about", "About"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="swipeHint">
        <span>‹</span>
        Swipe to explore
        <span>›</span>
      </div>

      <section
        className="content swipeContent"
        onTouchStart={(event) => {
          setTabTouchEnd(null);
          setTabTouchStart(
            event.targetTouches[0]?.clientX ?? null
          );
        }}
        onTouchMove={(event) => {
          setTabTouchEnd(
            event.targetTouches[0]?.clientX ?? null
          );
        }}
        onTouchEnd={finishProfileSwipe}
      >
        {tab === "featured" && (
          <>
            <section className="soundtrack">
              <div className="soundIcon">♫</div>

              <div className="soundInfo">
                <p>PROFILE SOUNDTRACK</p>

                <h2>
                  {song
                    ? songTitle
                    : "No soundtrack yet"}
                </h2>

                <span>
                  {song
                    ? songArtist ||
                      `Sound of @${username}`
                    : `${name} hasn't added a profile song yet.`}
                </span>
              </div>

              {song && (
                <button onClick={toggleMusic}>
                  {playing ? "❚❚" : "▶"}
                </button>
              )}
            </section>

            <section className="crewSection">
              <div className="heading">
                <div>
                  <p>INNER CIRCLE</p>
                  <h2>Top 8 Crew</h2>
                </div>

                <button onClick={() => setTab("crew")}>
                  View all
                </button>
              </div>

              <CrewGrid crew={crew} router={router} />
            </section>

            <section>
              <div className="heading">
                <div>
                  <p>SPOTLIGHT</p>
                  <h2>Featured</h2>
                </div>

                <button onClick={() => setTab("posts")}>
                  See all
                </button>
              </div>

              <MediaGrid items={featured} router={router} />
            </section>
          </>
        )}

        {tab === "posts" && (
          <>
            <div className="heading">
              <div>
                <p>LATEST FROM @{username}</p>
                <h2>Posts</h2>
              </div>
            </div>

            <MediaGrid items={posts} router={router} />
          </>
        )}

        {tab === "crew" && (
          <>
            <div className="heading">
              <div>
                <p>INNER CIRCLE</p>
                <h2>{name}'s Top 8</h2>
              </div>
            </div>

            <CrewGrid crew={crew} router={router} />
          </>
        )}

        {tab === "about" && (
          <div className="about">
            <article>
              <span>🎵</span>
              <b>Profile soundtrack</b>
              <p>{song ? songTitle : "Not added yet"}</p>
            </article>

            <article>
              <span>👥</span>
              <b>Top Crew</b>
              <p>{crew.length} of 8 featured</p>
            </article>

            <article>
              <span>🎬</span>
              <b>Creator posts</b>
              <p>{posts.length} posts on UTV</p>
            </article>

            <article>
              <span>⚡</span>
              <b>About</b>
              <p>{bio}</p>
            </article>
          </div>
        )}
      </section>


      {song && autoplayBlocked && (
        <button
          className="tapForSound"
          onClick={() => void toggleMusic()}
        >
          <span>♫</span>
          <div>
            <strong>{songTitle || "Profile soundtrack"}</strong>
            <small>Tap for sound</small>
          </div>
          <b>▶</b>
        </button>
      )}


      {socialSheet && (
        <div
          className="socialSheetBackdrop"
          onClick={() =>
            setSocialSheet(null)
          }
        >
          <section
            className="socialPeopleSheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="socialSheetHandle" />

            <header>
              <div>
                <p>UTV SOCIAL</p>

                <h2>
                  {socialSheet === "followers"
                    ? "Followers"
                    : "Following"}
                </h2>

                <span>
                  @{username}
                </span>
              </div>

              <button
                onClick={() =>
                  setSocialSheet(null)
                }
              >
                ×
              </button>
            </header>

            <div className="peopleList">
              {socialLoading ? (
                <div className="peopleEmpty">
                  <div className="miniSpinner" />
                  <b>Loading people…</b>
                </div>
              ) : socialUsers.length ? (
                socialUsers.map(
                  (person: any) => (
                    <button
                      key={person.email}
                      className="personRow"
                      onClick={() => {
                        setSocialSheet(null);

                        router.push(
                          `/u/${encodeURIComponent(
                            person.email
                          )}`
                        );
                      }}
                    >
                      <div className="personAvatar">
                        {person.avatar ? (
                          <img
                            src={person.avatar}
                            alt={person.name}
                          />
                        ) : (
                          <span>
                            {person.name
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div>
                        <strong>
                          {person.name}
                        </strong>

                        <small>
                          @{person.username}
                        </small>

                        <em>
                          {person.category}
                        </em>
                      </div>

                      <b>›</b>
                    </button>
                  )
                )
              ) : (
                <div className="peopleEmpty">
                  <span>👥</span>

                  <b>
                    No people here yet
                  </b>

                  <small>
                    Build your UTV circle.
                  </small>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {contactOpen && !isOwner && (
        <div
          className="contactBackdrop"
          onClick={() => setContactOpen(false)}
        >
          <section
            className="contactSheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="contactHandle" />

            <div className="contactTitle">
              <div>
                <p>CONNECT WITH</p>
                <h2>{name}</h2>
                <span>@{username}</span>
              </div>

              <button
                className="contactClose"
                onClick={() => setContactOpen(false)}
                aria-label="Close contact menu"
              >
                ×
              </button>
            </div>

            <div className="contactOptions">
              <button
                onClick={() =>
                  router.push(
                    `/calls?to=${encodeURIComponent(email)}`
                  )
                }
              >
                <span>📞</span>
                <div>
                  <strong>Audio Call</strong>
                  <small>Start a UTV voice call</small>
                </div>
                <b>›</b>
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/calls?to=${encodeURIComponent(email)}&type=video`
                  )
                }
              >
                <span>📹</span>
                <div>
                  <strong>Video Call</strong>
                  <small>Face-to-face on UTV</small>
                </div>
                <b>›</b>
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/book/${encodeURIComponent(email)}`
                  )
                }
              >
                <span>📅</span>
                <div>
                  <strong>Book Me</strong>
                  <small>Business, appearances & creator work</small>
                </div>
                <b>›</b>
              </button>
            </div>

            <button
              className="contactCancel"
              onClick={() => setContactOpen(false)}
            >
              Cancel
            </button>
          </section>
        </div>
      )}

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      <style jsx>{`


        .creatorDashboardButton {
          width: 100%;
          min-height: 58px;
          display: grid;
          grid-template-columns: 35px 1fr auto;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding: 9px 13px;
          border: 1px solid rgba(82,247,200,.25);
          border-radius: 18px;
          color: #fff;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.14),
              rgba(123,97,255,.15)
            );
          text-align: left;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition:
            transform .18s ease,
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .creatorDashboardButton:active {
          transform: scale(.985);
        }

        .creatorDashboardButton.open {
          border-color: rgba(82,247,200,.55);
          box-shadow:
            0 12px 38px rgba(82,247,200,.10);
        }

        .creatorDashboardButton > span {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #06140f;
          background:
            linear-gradient(135deg,#52f7c8,#9eff78);
          font-size: 16px;
        }

        .creatorDashboardButton div {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .creatorDashboardButton strong {
          font-size: 12px;
        }

        .creatorDashboardButton small {
          color: rgba(255,255,255,.45);
          font-size: 8px;
        }

        .creatorDashboardButton > b {
          color: rgba(255,255,255,.55);
          font-size: 17px;
        }

        .creatorDashboard {
          overflow: hidden;
          max-height: 0;
          margin: 0 12px;
          opacity: 0;
          transform: translateY(-12px);
          pointer-events: none;
          transition:
            max-height .42s cubic-bezier(.2,.75,.25,1),
            opacity .25s ease,
            transform .35s ease,
            margin .35s ease;
        }

        .creatorDashboard.open {
          max-height: 760px;
          margin-top: 13px;
          margin-bottom: 4px;
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .creatorDashboard.open {
          padding: 16px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(82,247,200,.10),
              transparent 36%
            ),
            radial-gradient(
              circle at 100% 0%,
              rgba(123,97,255,.15),
              transparent 40%
            ),
            rgba(8,12,20,.94);
          box-shadow:
            0 25px 70px rgba(0,0,0,.28);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .dashboardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .dashboardHeader p {
          margin: 0;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .dashboardHeader h2 {
          margin: 4px 0 3px;
          font-size: 22px;
          letter-spacing: -.035em;
        }

        .dashboardHeader span {
          color: rgba(255,255,255,.42);
          font-size: 9px;
        }

        .dashboardHeader button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          color: #fff;
          background: rgba(255,255,255,.07);
          font-size: 20px;
        }

        .creatorQuickActions {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 8px;
        }

        .creatorQuickActions button {
          min-height: 77px;
          display: grid;
          grid-template-columns: 40px 1fr;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          color: #fff;
          background: rgba(255,255,255,.035);
          text-align: left;
          transition:
            transform .15s ease,
            background .15s ease;
        }

        .creatorQuickActions button:active {
          transform: scale(.975);
          background: rgba(255,255,255,.075);
        }

        .creatorQuickActions button > span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.18),
              rgba(123,97,255,.22)
            );
          font-size: 16px;
          font-weight: 1000;
        }

        .creatorQuickActions button > div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .creatorQuickActions strong {
          font-size: 10px;
        }

        .creatorQuickActions small {
          overflow: hidden;
          color: rgba(255,255,255,.38);
          font-size: 7px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .creatorQuickActions .creatorPrimary {
          grid-column: 1 / -1;
          color: #06140f;
          border: 0;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9dff78,
              #9585ff
            );
        }

        .creatorQuickActions .creatorPrimary > span {
          color: #06140f;
          background: rgba(255,255,255,.35);
        }

        .creatorQuickActions .creatorPrimary small {
          color: rgba(6,20,15,.55);
        }


        .ownerProfileTools {
          position: absolute;
          z-index: 25;
          top: 17px;
          right: 16px;
        }

        .ownerCreatorButton {
          min-height: 39px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border:
            1px solid rgba(82,247,200,.25);
          border-radius: 999px;
          color: white;
          background:
            rgba(4,8,14,.72);
          box-shadow:
            0 10px 30px rgba(0,0,0,.22);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .ownerCreatorButton > span {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #06140f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9eff78
            );
          font-size: 12px;
        }

        .ownerCreatorButton strong {
          font-size: 9px;
          font-weight: 950;
        }

        .ownerCreatorButton > b {
          color:
            rgba(255,255,255,.55);
          font-size: 11px;
        }

        .ownerCreatorButton.open {
          border-color:
            rgba(82,247,200,.65);
          box-shadow:
            0 10px 35px
            rgba(82,247,200,.14);
        }

        .socialStats button {
          border: 0;
          color: inherit;
          background: transparent;
          font: inherit;
          cursor: pointer;
        }

        .socialStats button:active {
          transform: scale(.96);
        }

        .socialStats button {
          transition:
            transform .15s ease,
            background .15s ease;
        }

        .socialSheetBackdrop {
          position: fixed;
          inset: 0;
          z-index: 9200;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
          background:
            rgba(0,0,0,.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter:
            blur(14px);
        }

        .socialPeopleSheet {
          width: min(100%,520px);
          max-height: 76vh;
          overflow: hidden;
          padding: 8px 14px 16px;
          border:
            1px solid rgba(255,255,255,.11);
          border-radius: 28px;
          color: white;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(123,97,255,.16),
              transparent 34%
            ),
            linear-gradient(
              180deg,
              #111722,
              #06090f
            );
          box-shadow:
            0 -30px 90px rgba(0,0,0,.55);
          animation:
            peopleSheetUp .25s ease both;
        }

        @keyframes peopleSheetUp {
          from {
            opacity: 0;
            transform:
              translateY(35px);
          }

          to {
            opacity: 1;
            transform:
              translateY(0);
          }
        }

        .socialSheetHandle {
          width: 42px;
          height: 4px;
          margin: 1px auto 14px;
          border-radius: 999px;
          background:
            rgba(255,255,255,.19);
        }

        .socialPeopleSheet header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 2px 3px 12px;
        }

        .socialPeopleSheet header p {
          margin: 0;
          color: #52f7c8;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .15em;
        }

        .socialPeopleSheet header h2 {
          margin: 3px 0 1px;
          font-size: 25px;
          letter-spacing: -.04em;
        }

        .socialPeopleSheet header span {
          color:
            rgba(255,255,255,.45);
          font-size: 9px;
        }

        .socialPeopleSheet header button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          color: white;
          background:
            rgba(255,255,255,.07);
          font-size: 21px;
        }

        .peopleList {
          max-height: 58vh;
          overflow-y: auto;
          display: grid;
          gap: 5px;
          padding-bottom: 5px;
        }

        .personRow {
          width: 100%;
          min-height: 67px;
          display: grid;
          grid-template-columns:
            48px 1fr auto;
          align-items: center;
          gap: 11px;
          padding: 8px 9px;
          border: 0;
          border-bottom:
            1px solid rgba(255,255,255,.055);
          color: white;
          background: transparent;
          text-align: left;
        }

        .personRow:active {
          background:
            rgba(255,255,255,.05);
        }

        .personAvatar {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          padding: 2px;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #7865ff,
              #ff62b6
            );
        }

        .personAvatar img,
        .personAvatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border:
            3px solid #080c13;
          border-radius: 14px;
          object-fit: cover;
          color: #07120e;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #fff
            );
          font-size: 17px;
          font-weight: 1000;
        }

        .personRow > div:nth-child(2) {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .personRow strong {
          overflow: hidden;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .personRow small {
          color: #52f7c8;
          font-size: 8px;
        }

        .personRow em {
          color:
            rgba(255,255,255,.35);
          font-size: 7px;
          font-style: normal;
        }

        .personRow > b {
          color:
            rgba(255,255,255,.25);
          font-size: 20px;
        }

        .peopleEmpty {
          min-height: 180px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 6px;
          color:
            rgba(255,255,255,.55);
          text-align: center;
        }

        .peopleEmpty > span {
          font-size: 31px;
        }

        .peopleEmpty b {
          color: white;
          font-size: 11px;
        }

        .peopleEmpty small {
          font-size: 8px;
        }

        .miniSpinner {
          width: 28px;
          height: 28px;
          border:
            3px solid
            rgba(255,255,255,.11);
          border-top-color:
            #52f7c8;
          border-radius: 50%;
          animation:
            socialSpin .7s linear infinite;
        }

        @keyframes socialSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .socialActions {
          display:grid;
          grid-template-columns:1fr 1fr 1fr;
          gap:8px;
          width:100%;
          margin-top:18px;
        }

        .socialActions button {
          min-height:46px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 12px;
          border:1px solid rgba(255,255,255,.13);
          border-radius:14px;
          color:#fff;
          background:rgba(255,255,255,.075);
          font-size:11px;
          font-weight:950;
          backdrop-filter:blur(16px);
          -webkit-backdrop-filter:blur(16px);
        }

        .socialActions .messageAction {
          background:rgba(255,255,255,.09);
        }

        .socialActions .walkieAction {
          position:relative;
          overflow:hidden;
          color:#04120d;
          border-color:rgba(82,247,200,.6);
          background:linear-gradient(135deg,#52f7c8,#8effdc);
          box-shadow:0 10px 35px rgba(82,247,200,.19);
        }

        .walkiePulse {
          width:7px;
          height:7px;
          border-radius:999px;
          background:#06120d;
          box-shadow:0 0 0 0 rgba(6,18,13,.35);
          animation:walkieProfilePulse 1.4s infinite;
        }

        @keyframes walkieProfilePulse {
          70% { box-shadow:0 0 0 8px rgba(6,18,13,0); }
          100% { box-shadow:0 0 0 0 rgba(6,18,13,0); }
        }

        .socialActions .contactAction {
          border-color:rgba(142,116,255,.35);
          background:linear-gradient(
            135deg,
            rgba(123,97,255,.23),
            rgba(82,247,200,.09)
          );
        }

        .top8Spotlight {
          margin:14px 12px 8px;
          padding:15px;
          border:1px solid rgba(255,255,255,.09);
          border-radius:20px;
          background:
            radial-gradient(circle at 0% 0%,rgba(82,247,200,.08),transparent 38%),
            rgba(255,255,255,.035);
        }

        .top8Heading {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:12px;
        }

        .top8Heading p {
          margin:0 0 3px;
          color:#52f7c8;
          font-size:8px;
          font-weight:1000;
          letter-spacing:.15em;
        }

        .top8Heading h2 {
          margin:0;
          font-size:21px;
          letter-spacing:-.03em;
        }

        .top8Heading button {
          border:0;
          padding:7px 10px;
          border-radius:999px;
          color:rgba(255,255,255,.72);
          background:rgba(255,255,255,.07);
          font-size:9px;
          font-weight:900;
        }

        .tapForSound {
          position: fixed;
          z-index: 7000;
          left: 50%;
          bottom: 102px;
          width: min(420px,calc(100% - 28px));
          min-height: 54px;
          display: grid;
          grid-template-columns: 38px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid rgba(82,247,200,.24);
          border-radius: 18px;
          color: #fff;
          background:
            linear-gradient(
              135deg,
              rgba(5,10,16,.96),
              rgba(18,17,36,.96)
            );
          box-shadow: 0 18px 55px rgba(0,0,0,.46);
          transform: translateX(-50%);
          text-align: left;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          animation: soundUp .25s ease both;
        }

        .tapForSound > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #07120e;
          background:
            linear-gradient(135deg,#52f7c8,#8c7cff);
          font-size: 18px;
          font-weight: 1000;
        }

        .tapForSound div {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .tapForSound strong {
          overflow: hidden;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tapForSound small {
          color: #52f7c8;
          font-size: 8px;
          font-weight: 900;
        }

        .tapForSound > b {
          font-size: 16px;
        }

        @keyframes soundUp {
          from {
            opacity: 0;
            transform: translate(-50%,10px);
          }

          to {
            opacity: 1;
            transform: translate(-50%,0);
          }
        }

        .contactBackdrop {
          position:fixed;
          inset:0;
          z-index:9000;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          padding:18px 12px 12px;
          background:rgba(0,0,0,.72);
          backdrop-filter:blur(14px);
          -webkit-backdrop-filter:blur(14px);
        }

        .contactSheet {
          width:min(100%,520px);
          padding:9px 14px 14px;
          border:1px solid rgba(255,255,255,.13);
          border-radius:28px;
          background:
            radial-gradient(circle at 90% 0%,rgba(123,97,255,.18),transparent 35%),
            linear-gradient(180deg,#111725,#070a11);
          box-shadow:0 -30px 90px rgba(0,0,0,.65);
        }

        .contactHandle {
          width:42px;
          height:4px;
          margin:0 auto 13px;
          border-radius:999px;
          background:rgba(255,255,255,.2);
        }

        .contactTitle {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          padding:4px 5px 13px;
        }

        .contactTitle p {
          margin:0;
          color:#52f7c8;
          font-size:8px;
          font-weight:1000;
          letter-spacing:.15em;
        }

        .contactTitle h2 {
          margin:3px 0 1px;
          font-size:25px;
          letter-spacing:-.04em;
        }

        .contactTitle span {
          color:rgba(255,255,255,.5);
          font-size:11px;
        }

        .contactClose {
          width:34px;
          height:34px;
          border:0;
          border-radius:50%;
          color:#fff;
          background:rgba(255,255,255,.08);
          font-size:22px;
        }

        .contactOptions {
          display:grid;
          gap:7px;
        }

        .contactOptions > button {
          width:100%;
          min-height:64px;
          display:grid;
          grid-template-columns:38px 1fr auto;
          align-items:center;
          gap:10px;
          padding:9px 12px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:16px;
          color:#fff;
          background:rgba(255,255,255,.045);
          text-align:left;
        }

        .contactOptions > button > span {
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          border-radius:12px;
          background:rgba(255,255,255,.07);
          font-size:18px;
        }

        .contactOptions > button div {
          display:grid;
          gap:2px;
        }

        .contactOptions strong {
          font-size:11px;
        }

        .contactOptions small {
          color:rgba(255,255,255,.45);
          font-size:8px;
        }

        .contactOptions b {
          color:rgba(255,255,255,.3);
          font-size:20px;
        }

        .contactCancel {
          width:100%;
          min-height:43px;
          margin-top:9px;
          border:0;
          border-radius:14px;
          color:rgba(255,255,255,.72);
          background:rgba(255,255,255,.055);
          font-size:10px;
          font-weight:900;
        }

        @media(max-width:390px) {
          .socialActions {
            gap:6px;
          }

          .socialActions button {
            padding:0 7px;
            font-size:9px;
          }

          .top8Spotlight {
            margin-left:9px;
            margin-right:9px;
          }
        }

        .page {
          min-height: 100vh;
          padding-bottom: 150px;
          color: white;
          background:
            radial-gradient(circle at 8% 0%,rgba(82,247,200,.14),transparent 30%),
            radial-gradient(circle at 92% 6%,rgba(131,87,255,.22),transparent 34%),
            linear-gradient(180deg,#07101d,#02040a);
        }

        .previewBar {
          position: relative;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 13px 15px;
          color: #061510;
          background: linear-gradient(135deg,#53f4cd,#9cff78);
        }

        .previewBar b,
        .previewBar span {
          display: block;
        }

        .previewBar span {
          margin-top: 2px;
          font-size: 11px;
          opacity: .7;
        }

        .previewBar button {
          min-height: 40px;
          border: 0;
          border-radius: 13px;
          padding: 0 13px;
          color: white;
          background: #07101d;
          font-weight: 900;
        }

        .hero {
          min-height: 560px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 24px;
          padding: 22px 18px 32px;
          background-position: center;
          background-size: cover;
        }

        .identity {
          display: grid;
          grid-template-columns: auto minmax(0,1fr);
          align-items: end;
          gap: 17px;
        }

        .avatar {
          width: 112px;
          height: 112px;
          padding: 4px;
          border-radius: 36px;
          background:
            linear-gradient(135deg,#53f4cd,#8b6dff,#ff5baa);
          box-shadow: 0 18px 50px rgba(0,0,0,.45);
        }

        .avatar img,
        .avatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border: 4px solid #070b13;
          border-radius: 32px;
          object-fit: cover;
          color: #061510;
          background: linear-gradient(135deg,#53f4cd,#fff);
          font-size: 42px;
          font-weight: 1000;
        }

        .category {
          margin: 0 0 7px;
          color: #53f4cd;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(42px,11vw,70px);
          line-height: .92;
          letter-spacing: -.055em;
        }

        .username {
          display: block;
          margin-top: 9px;
          color: #53f4cd;
          font-size: 18px;
        }

        .bio {
          max-width: 580px;
          margin: 10px 0 0;
          color: rgba(255,255,255,.73);
          line-height: 1.45;
        }

        .actions,
        .ownerActions {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 9px;
        }

        .actions button,
        .ownerActions button {
          min-height: 53px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 18px;
          color: white;
          background: rgba(5,9,16,.72);
          backdrop-filter: blur(18px);
          font-weight: 950;
        }

        .actions .primary {
          color: #061510;
          border: 0;
          background:
            linear-gradient(135deg,#53f4cd,#aaff79);
        }

        .stats {
          position: relative;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
          margin: -18px 14px 0;
        }

        .stats article {
          min-width: 0;
          padding: 18px 5px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 21px;
          background: rgba(8,13,23,.94);
          text-align: center;
          backdrop-filter: blur(18px);
        }

        .stats strong {
          display: block;
          font-size: 23px;
        }

        .stats span {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 900;
        }

        .tabs {
          position: sticky;
          top: 0;
          z-index: 80;
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 6px;
          margin: 14px;
          padding: 7px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 22px;
          background: rgba(4,8,15,.92);
          backdrop-filter: blur(22px);
        }

        .tabs button {
          min-height: 44px;
          border: 0;
          border-radius: 15px;
          color: rgba(255,255,255,.54);
          background: transparent;
          font-size: 10px;
          font-weight: 950;
        }

        .tabs button.active {
          color: #061510;
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff);
        }

        .swipeHint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: -5px 0 7px;
          color: rgba(255,255,255,.28);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          user-select: none;
        }

        .swipeHint span {
          color: #52f7c8;
          font-size: 15px;
        }

        .content {
          padding: 3px 14px 40px;
        }

        .swipeContent {
          touch-action: pan-y;
          animation: tabContentIn .24s ease both;
        }

        @keyframes tabContentIn {
          from {
            opacity: .55;
            transform: translateX(8px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .soundtrack {
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 27px;
          background:
            linear-gradient(
              135deg,
              rgba(129,88,255,.24),
              rgba(82,247,200,.12)
            );
        }

        .soundIcon {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #061510;
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff);
          font-size: 27px;
          font-weight: 1000;
        }

        .soundInfo {
          min-width: 0;
        }

        .soundInfo p,
        .heading p {
          margin: 0;
          color: #53f4cd;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .13em;
        }

        .soundInfo h2 {
          overflow: hidden;
          margin: 4px 0;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .soundInfo span {
          color: rgba(255,255,255,.55);
          font-size: 11px;
        }

        .soundtrack button,
        .heading button {
          min-height: 44px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 15px;
          padding: 0 15px;
          color: white;
          background: rgba(4,8,15,.75);
          font-weight: 950;
        }

        .heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          margin: 29px 3px 13px;
        }

        .heading h2 {
          margin: 5px 0 0;
          font-size: 25px;
        }

        .about {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 10px;
        }

        .about article {
          min-height: 145px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 24px;
          background: rgba(255,255,255,.045);
        }

        .about article > span {
          display: block;
          margin-bottom: 22px;
          font-size: 27px;
        }

        .about b {
          display: block;
        }

        .about p {
          color: rgba(255,255,255,.5);
          font-size: 12px;
          line-height: 1.5;
        }

        .notice {
          position: fixed;
          z-index: 3000;
          left: 50%;
          bottom: 130px;
          width: min(430px,calc(100% - 30px));
          padding: 14px;
          border: 1px solid rgba(82,247,200,.28);
          border-radius: 18px;
          background: rgba(5,9,17,.96);
          transform: translateX(-50%);
          text-align: center;
          font-weight: 900;
        }

        @media (max-width: 560px) {
          .identity {
            grid-template-columns: 1fr;
          }

          .avatar {
            width: 96px;
            height: 96px;
          }

          .previewBar {
            align-items: flex-start;
          }

          .previewBar span {
            display: none;
          }
        }

        @media (min-width: 760px) {
          .page {
            max-width: 900px;
            margin: auto;
          }

          .hero {
            margin-top: 18px;
            border-radius: 36px;
          }
        }


        /* ===== UTV PROFILE POLISH ===== */

        .page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at 50% 600px,
              rgba(100,70,190,.10),
              transparent 48%
            ),
            #03060d;
        }

        .hero {
          position: relative;
          isolation: isolate;
          min-height: 620px;
          padding-bottom: 60px;
          background-position: center top !important;
          background-size: cover !important;
        }

        .hero::after {
          content: "";
          position: absolute;
          z-index: -1;
          left: 0;
          right: 0;
          bottom: -90px;
          height: 165px;
          pointer-events: none;
          background:
            linear-gradient(
              180deg,
              rgba(3,6,13,.96),
              rgba(3,6,13,.68) 52%,
              transparent
            );
        }

        .identity {
          position: relative;
          z-index: 5;
        }

        .bio {
          text-shadow: 0 2px 14px rgba(0,0,0,.8);
        }

        /* Creator control */

        .ownerProfileTools {
          position: absolute !important;
          z-index: 80 !important;
          top: 18px !important;
          right: 16px !important;
          width: auto !important;
          margin: 0 !important;
          display: block !important;
        }

        .ownerCreatorButton {
          width: auto !important;
          min-width: 96px !important;
          min-height: 42px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 7px !important;
          padding: 6px 11px 6px 7px !important;

          border:
            1px solid rgba(82,247,200,.46) !important;

          border-radius: 999px !important;
          color: white !important;
          background: rgba(3,8,14,.84) !important;

          box-shadow:
            0 10px 32px rgba(0,0,0,.38),
            0 0 18px rgba(82,247,200,.10) !important;

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .ownerCreatorButton > span {
          width: 28px !important;
          height: 28px !important;
          display: grid !important;
          place-items: center !important;
          border-radius: 50% !important;
          color: #04130e !important;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #a0ff7a
            ) !important;
        }

        .ownerCreatorButton strong {
          display: block !important;
          color: white !important;
          font-size: 10px !important;
          font-weight: 950 !important;
        }

        .ownerCreatorButton > b {
          display: block !important;
          color: rgba(255,255,255,.60) !important;
          font-size: 10px !important;
        }

        /* Profile music */

        .profileMusicBar {
          position: relative;
          z-index: 25;
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          align-items: center;
          gap: 11px;

          margin: -22px 12px 12px;
          padding: 10px 12px;

          border: 1px solid rgba(82,247,200,.20);
          border-radius: 17px;

          background:
            linear-gradient(
              110deg,
              rgba(7,13,21,.86),
              rgba(92,63,170,.18)
            );

          box-shadow: 0 12px 34px rgba(0,0,0,.22);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .musicPlayButton {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 13px;
          color: #06130f;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9187ff
            );

          font-size: 13px;
          font-weight: 1000;
        }

        .profileMusicInfo {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .profileMusicInfo span {
          color: #52f7c8;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .profileMusicInfo strong {
          overflow: hidden;
          color: white;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .profileMusicInfo small {
          overflow: hidden;
          color: rgba(255,255,255,.46);
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .musicBars {
          height: 26px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .musicBars i {
          width: 2px;
          height: 7px;
          display: block;
          border-radius: 99px;
          background: rgba(82,247,200,.5);
        }

        .musicBars.active i {
          animation:
            utvProfileMusic .65s
            ease-in-out infinite alternate;
        }

        .musicBars.active i:nth-child(2) {
          animation-delay: -.3s;
        }

        .musicBars.active i:nth-child(3) {
          animation-delay: -.12s;
        }

        .musicBars.active i:nth-child(4) {
          animation-delay: -.45s;
        }

        @keyframes utvProfileMusic {
          from {
            height: 6px;
            opacity: .45;
          }

          to {
            height: 24px;
            opacity: 1;
          }
        }

        /* Cleaner social stats */

        .stats.socialStats {
          position: relative;
          z-index: 20;
          display: grid !important;
          grid-template-columns:
            repeat(4,minmax(0,1fr)) !important;

          gap: 0 !important;
          margin: 0 8px 12px !important;
          padding: 7px 0 9px !important;

          border: 0 !important;
          border-top:
            1px solid rgba(255,255,255,.065) !important;
          border-bottom:
            1px solid rgba(255,255,255,.065) !important;

          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .stats.socialStats button {
          position: relative;
          min-width: 0 !important;
          min-height: 57px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2px !important;
          margin: 0 !important;
          padding: 4px 2px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .stats.socialStats button:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 13px;
          right: 0;
          width: 1px;
          height: 31px;
          background: rgba(255,255,255,.07);
        }

        .stats.socialStats strong {
          color: white !important;
          font-size: 25px !important;
          line-height: 1 !important;
        }

        .stats.socialStats span {
          margin-top: 4px !important;
          color: rgba(255,255,255,.47) !important;
          font-size: 10px !important;
          font-weight: 900 !important;
        }

        /* Lower profile */

        .top8Spotlight {
          margin-left: 12px !important;
          margin-right: 12px !important;

          border-color:
            rgba(255,255,255,.07) !important;

          background:
            linear-gradient(
              135deg,
              rgba(9,16,27,.58),
              rgba(37,31,72,.32)
            ) !important;

          box-shadow:
            0 15px 40px rgba(0,0,0,.12) !important;

          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .tabs {
          background:
            rgba(3,6,13,.74) !important;

          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }




        /* ===== UTV PROFILE POLISH ===== */

        .page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(
              circle at 50% 600px,
              rgba(100,70,190,.10),
              transparent 48%
            ),
            #03060d;
        }

        .hero {
          position: relative;
          isolation: isolate;
          min-height: 620px;
          padding-bottom: 60px;
          background-position: center top !important;
          background-size: cover !important;
        }

        .hero::after {
          content: "";
          position: absolute;
          z-index: -1;
          left: 0;
          right: 0;
          bottom: -90px;
          height: 165px;
          pointer-events: none;
          background:
            linear-gradient(
              180deg,
              rgba(3,6,13,.96),
              rgba(3,6,13,.68) 52%,
              transparent
            );
        }

        .identity {
          position: relative;
          z-index: 5;
        }

        .bio {
          text-shadow: 0 2px 14px rgba(0,0,0,.8);
        }

        /* Creator control */

        .ownerProfileTools {
          position: absolute !important;
          z-index: 80 !important;
          top: 18px !important;
          right: 16px !important;
          width: auto !important;
          margin: 0 !important;
          display: block !important;
        }

        .ownerCreatorButton {
          width: auto !important;
          min-width: 96px !important;
          min-height: 42px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 7px !important;
          padding: 6px 11px 6px 7px !important;

          border:
            1px solid rgba(82,247,200,.46) !important;

          border-radius: 999px !important;
          color: white !important;
          background: rgba(3,8,14,.84) !important;

          box-shadow:
            0 10px 32px rgba(0,0,0,.38),
            0 0 18px rgba(82,247,200,.10) !important;

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .ownerCreatorButton > span {
          width: 28px !important;
          height: 28px !important;
          display: grid !important;
          place-items: center !important;
          border-radius: 50% !important;
          color: #04130e !important;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #a0ff7a
            ) !important;
        }

        .ownerCreatorButton strong {
          display: block !important;
          color: white !important;
          font-size: 10px !important;
          font-weight: 950 !important;
        }

        .ownerCreatorButton > b {
          display: block !important;
          color: rgba(255,255,255,.60) !important;
          font-size: 10px !important;
        }

        /* Profile music */

        .profileMusicBar {
          position: relative;
          z-index: 25;
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          align-items: center;
          gap: 11px;

          margin: -22px 12px 12px;
          padding: 10px 12px;

          border: 1px solid rgba(82,247,200,.20);
          border-radius: 17px;

          background:
            linear-gradient(
              110deg,
              rgba(7,13,21,.86),
              rgba(92,63,170,.18)
            );

          box-shadow: 0 12px 34px rgba(0,0,0,.22);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .musicPlayButton {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 13px;
          color: #06130f;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #9187ff
            );

          font-size: 13px;
          font-weight: 1000;
        }

        .profileMusicInfo {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .profileMusicInfo span {
          color: #52f7c8;
          font-size: 7px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .profileMusicInfo strong {
          overflow: hidden;
          color: white;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .profileMusicInfo small {
          overflow: hidden;
          color: rgba(255,255,255,.46);
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .musicBars {
          height: 26px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .musicBars i {
          width: 2px;
          height: 7px;
          display: block;
          border-radius: 99px;
          background: rgba(82,247,200,.5);
        }

        .musicBars.active i {
          animation:
            utvProfileMusic .65s
            ease-in-out infinite alternate;
        }

        .musicBars.active i:nth-child(2) {
          animation-delay: -.3s;
        }

        .musicBars.active i:nth-child(3) {
          animation-delay: -.12s;
        }

        .musicBars.active i:nth-child(4) {
          animation-delay: -.45s;
        }

        @keyframes utvProfileMusic {
          from {
            height: 6px;
            opacity: .45;
          }

          to {
            height: 24px;
            opacity: 1;
          }
        }

        /* Cleaner social stats */

        .stats.socialStats {
          position: relative;
          z-index: 20;
          display: grid !important;
          grid-template-columns:
            repeat(4,minmax(0,1fr)) !important;

          gap: 0 !important;
          margin: 0 8px 12px !important;
          padding: 7px 0 9px !important;

          border: 0 !important;
          border-top:
            1px solid rgba(255,255,255,.065) !important;
          border-bottom:
            1px solid rgba(255,255,255,.065) !important;

          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .stats.socialStats button {
          position: relative;
          min-width: 0 !important;
          min-height: 57px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2px !important;
          margin: 0 !important;
          padding: 4px 2px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .stats.socialStats button:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 13px;
          right: 0;
          width: 1px;
          height: 31px;
          background: rgba(255,255,255,.07);
        }

        .stats.socialStats strong {
          color: white !important;
          font-size: 25px !important;
          line-height: 1 !important;
        }

        .stats.socialStats span {
          margin-top: 4px !important;
          color: rgba(255,255,255,.47) !important;
          font-size: 10px !important;
          font-weight: 900 !important;
        }

        /* Lower profile */

        .top8Spotlight {
          margin-left: 12px !important;
          margin-right: 12px !important;

          border-color:
            rgba(255,255,255,.07) !important;

          background:
            linear-gradient(
              135deg,
              rgba(9,16,27,.58),
              rgba(37,31,72,.32)
            ) !important;

          box-shadow:
            0 15px 40px rgba(0,0,0,.12) !important;

          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .tabs {
          background:
            rgba(3,6,13,.74) !important;

          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }


      

        /* =====================================================
           UTV PROFILE 3.0 — SOCIAL LUXURY
           PROFILE • TOP 8 • MUSIC • CREATOR HUB
           ===================================================== */

        .page {
          min-height:100svh !important;
          padding-bottom:105px !important;
          overflow-x:hidden !important;
          color:#fff !important;
          background:
            radial-gradient(
              circle at 18% 13%,
              rgba(82,247,200,.075),
              transparent 24%
            ),
            radial-gradient(
              circle at 85% 18%,
              rgba(126,75,255,.10),
              transparent 29%
            ),
            #020305 !important;
        }

        /*
           COVER / PROFILE HERO
        */

        .hero {
          position:relative !important;
          min-height:430px !important;
          margin:0 auto !important;
          padding:
            185px 18px 25px !important;

          overflow:hidden !important;

          background-position:center !important;
          background-size:cover !important;

          border-radius:
            0 0 30px 30px !important;

          box-shadow:
            0 24px 65px rgba(0,0,0,.44) !important;
        }

        .hero::before {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;

          background:
            linear-gradient(
              180deg,
              rgba(0,0,0,.04) 0%,
              rgba(0,0,0,.13) 32%,
              rgba(2,3,6,.68) 66%,
              #020305 100%
            );
        }

        .hero::after {
          content:"";
          position:absolute;
          right:-90px;
          bottom:-100px;

          width:260px;
          height:260px;

          border-radius:50%;

          pointer-events:none;

          background:
            radial-gradient(
              circle,
              rgba(122,72,255,.18),
              transparent 68%
            );

          filter:blur(12px);
        }

        .identity {
          position:relative !important;
          z-index:5 !important;

          display:flex !important;
          flex-direction:column !important;
          align-items:flex-start !important;
          justify-content:flex-end !important;
          gap:0 !important;

          width:min(100%,760px) !important;
          margin:0 auto !important;
        }

        .avatar {
          width:104px !important;
          height:104px !important;

          padding:4px !important;

          border-radius:31px !important;

          background:
            linear-gradient(
              145deg,
              #52f7c8,
              #ffffff 30%,
              #845cff 67%,
              #d85cff
            ) !important;

          box-shadow:
            0 15px 38px rgba(0,0,0,.48),
            0 0 24px rgba(82,247,200,.16),
            0 0 34px rgba(128,76,255,.15) !important;
        }

        .avatar img,
        .avatar > span {
          width:100% !important;
          height:100% !important;

          border:
            4px solid #050609 !important;

          border-radius:27px !important;

          object-fit:cover !important;
        }

        .identityText {
          min-width:0 !important;
          width:auto !important;
          max-width:320px !important;
          margin:10px 0 0 2px !important;
          padding:0 !important;
          transform:none !important;
          text-align:left !important;
        }

        .category {
          margin:0 0 4px !important;

          color:#69f8d2 !important;

          font-size:9px !important;
          font-weight:1000 !important;

          letter-spacing:.16em !important;
          text-transform:uppercase !important;

          text-shadow:
            0 0 15px rgba(82,247,200,.34);
        }

        .identityText h1 {
          margin:0 !important;

          max-width:100% !important;

          overflow:hidden !important;

          font-size:
            clamp(27px,7vw,42px) !important;

          line-height:.98 !important;
          letter-spacing:-.055em !important;

          text-overflow:ellipsis !important;
          white-space:nowrap !important;

          text-shadow:
            0 5px 25px rgba(0,0,0,.55) !important;
        }

        .username {
          display:block !important;

          margin-top:5px !important;

          color:
            rgba(255,255,255,.62) !important;

          font-size:11px !important;
          font-weight:760 !important;
        }

        .bio {
          max-width:540px !important;

          margin:
            10px 0 0 !important;

          color:
            rgba(255,255,255,.76) !important;

          font-size:11px !important;
          line-height:1.5 !important;
        }

        /*
           OWNER / SOCIAL BUTTONS
        */

        .ownerProfileTools {
          top:15px !important;
          right:14px !important;
        }

        .ownerCreatorButton {
          min-height:42px !important;

          border:
            1px solid rgba(255,255,255,.16) !important;

          background:
            linear-gradient(
              145deg,
              rgba(5,8,13,.82),
              rgba(21,11,39,.78)
            ) !important;

          box-shadow:
            0 13px 35px rgba(0,0,0,.34),
            inset 0 1px rgba(255,255,255,.08) !important;
        }

        .socialActions {
          position:relative !important;
          z-index:6 !important;

          width:min(100%,760px) !important;

          margin:
            18px auto 0 !important;

          display:grid !important;
          grid-template-columns:
            1.25fr 1fr 1fr !important;

          gap:8px !important;
        }

        .socialActions button {
          min-height:44px !important;

          border-radius:14px !important;

          font-size:10px !important;
          font-weight:900 !important;

          backdrop-filter:blur(16px) !important;
          -webkit-backdrop-filter:
            blur(16px) !important;
        }

        .messageAction {
          color:#07120f !important;
          border:0 !important;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #83f4d5
            ) !important;
        }

        .walkieAction,
        .contactAction {
          border:
            1px solid rgba(255,255,255,.13) !important;

          color:#fff !important;

          background:
            rgba(5,7,12,.74) !important;
        }

        /*
           MUSIC — ONE PLAYER ONLY
        */

        .profileMusicBar {
          position:relative !important;

          width:min(calc(100% - 24px),720px) !important;

          min-height:67px !important;

          margin:
            -2px auto 13px !important;

          display:grid !important;
          grid-template-columns:
            45px minmax(0,1fr) 36px !important;

          align-items:center !important;
          gap:11px !important;

          padding:
            10px 13px !important;

          overflow:hidden !important;

          border:
            1px solid rgba(141,96,255,.24) !important;

          border-radius:19px !important;

          background:
            radial-gradient(
              circle at 0% 50%,
              rgba(82,247,200,.11),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              rgba(9,13,19,.96),
              rgba(17,10,31,.96)
            ) !important;

          box-shadow:
            0 17px 45px rgba(0,0,0,.27),
            inset 0 1px rgba(255,255,255,.05) !important;
        }

        .musicPlayButton {
          width:43px !important;
          height:43px !important;

          border:
            1px solid rgba(255,255,255,.2) !important;

          border-radius:50% !important;

          color:#07120f !important;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #a7ffdc
            ) !important;

          box-shadow:
            0 0 22px rgba(82,247,200,.17) !important;
        }

        .profileMusicInfo {
          min-width:0 !important;
        }

        .profileMusicInfo span {
          color:#62f7d0 !important;

          font-size:7px !important;
          font-weight:1000 !important;

          letter-spacing:.15em !important;
        }

        .profileMusicInfo strong,
        .profileMusicInfo small {
          display:block !important;

          overflow:hidden !important;

          text-overflow:ellipsis !important;
          white-space:nowrap !important;
        }

        .profileMusicInfo strong {
          margin-top:2px !important;
          font-size:12px !important;
        }

        .profileMusicInfo small {
          margin-top:2px !important;

          color:
            rgba(255,255,255,.43) !important;

          font-size:8px !important;
        }

        /*
           STATS — SOCIAL, NOT DASHBOARD
        */

        .stats {
          width:min(calc(100% - 24px),720px) !important;

          min-height:68px !important;

          margin:
            0 auto 15px !important;

          padding:6px !important;

          display:grid !important;
          grid-template-columns:
            repeat(4,1fr) !important;

          border:
            1px solid rgba(255,255,255,.075) !important;

          border-radius:19px !important;

          background:
            rgba(255,255,255,.025) !important;
        }

        .socialStats button {
          min-height:54px !important;

          border-radius:14px !important;
        }

        .socialStats button:active {
          background:
            rgba(255,255,255,.055) !important;
        }

        .socialStats strong {
          display:block !important;

          font-size:16px !important;
          line-height:1 !important;
        }

        .socialStats span {
          display:block !important;

          margin-top:5px !important;

          color:
            rgba(255,255,255,.42) !important;

          font-size:7px !important;
          font-weight:800 !important;

          letter-spacing:.04em !important;
          text-transform:uppercase !important;
        }

        /*
           TOP 8 — SIGNATURE UTV FEATURE
        */

        .top8Spotlight {
          width:min(calc(100% - 24px),720px) !important;

          margin:
            0 auto 16px !important;

          padding:
            15px 13px 14px !important;

          overflow:hidden !important;

          border:
            1px solid rgba(139,91,255,.16) !important;

          border-radius:23px !important;

          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(127,74,255,.12),
              transparent 36%
            ),
            radial-gradient(
              circle at 0% 100%,
              rgba(82,247,200,.07),
              transparent 32%
            ),
            rgba(8,10,16,.88) !important;

          box-shadow:
            0 18px 48px rgba(0,0,0,.24) !important;
        }

        .top8Heading {
          margin-bottom:12px !important;
        }

        .top8Heading p {
          margin:0 !important;

          color:#9f7aff !important;

          font-size:7px !important;
          font-weight:1000 !important;

          letter-spacing:.17em !important;
        }

        .top8Heading h2 {
          margin:3px 0 0 !important;

          font-size:19px !important;
          letter-spacing:-.04em !important;
        }

        .top8Heading button {
          min-height:31px !important;

          padding:0 11px !important;

          border:
            1px solid rgba(255,255,255,.09) !important;

          border-radius:999px !important;

          color:
            rgba(255,255,255,.68) !important;

          background:
            rgba(255,255,255,.035) !important;

          font-size:8px !important;
        }

        /*
           PROFILE TABS
        */

        .tabs {
          position:sticky !important;
          top:53px !important;
          z-index:30 !important;

          width:min(100%,760px) !important;

          margin:
            4px auto 0 !important;

          padding:
            5px 10px !important;

          display:grid !important;
          grid-template-columns:
            repeat(4,1fr) !important;

          gap:4px !important;

          border-top:
            1px solid rgba(255,255,255,.06) !important;

          border-bottom:
            1px solid rgba(255,255,255,.06) !important;

          background:
            rgba(2,3,5,.88) !important;

          backdrop-filter:
            blur(20px) !important;

          -webkit-backdrop-filter:
            blur(20px) !important;
        }

        .tabs button {
          min-height:37px !important;

          border:0 !important;
          border-radius:11px !important;

          color:
            rgba(255,255,255,.42) !important;

          background:transparent !important;

          font-size:9px !important;
          font-weight:900 !important;
        }

        .tabs button.active {
          color:#fff !important;

          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.12),
              rgba(126,79,255,.16)
            ) !important;

          box-shadow:
            inset 0 -2px #52f7c8 !important;
        }

        .swipeHint {
          margin:
            7px auto 0 !important;

          color:
            rgba(255,255,255,.22) !important;

          font-size:7px !important;
          letter-spacing:.12em !important;
        }

        /*
           CONTENT
        */

        .content {
          width:min(calc(100% - 20px),740px) !important;

          margin:
            9px auto 0 !important;

          padding-bottom:30px !important;
        }

        .heading {
          margin:
            10px 2px 11px !important;
        }

        .heading p {
          color:#6df7d3 !important;

          font-size:7px !important;
          letter-spacing:.16em !important;
        }

        .heading h2 {
          margin-top:3px !important;

          font-size:21px !important;
          letter-spacing:-.04em !important;
        }

        /*
           FEATURED SOUNDTRACK SHOULD BE SECONDARY.
           Main soundtrack player already lives above stats.
        */

        .soundtrack {
          padding:
            13px !important;

          border-radius:19px !important;

          border:
            1px solid rgba(255,255,255,.07) !important;

          background:
            rgba(255,255,255,.025) !important;
        }

        /*
           CREATOR HUB
        */

        .creatorDashboard.open {
          width:min(calc(100% - 24px),720px) !important;

          max-height:920px !important;

          margin:
            12px auto 15px !important;

          padding:16px !important;

          border-radius:23px !important;

          border:
            1px solid rgba(129,84,255,.17) !important;

          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(124,75,255,.15),
              transparent 36%
            ),
            radial-gradient(
              circle at 0% 100%,
              rgba(82,247,200,.08),
              transparent 34%
            ),
            #080b11 !important;
        }

        .dashboardHeader p {
          color:#70f8d5 !important;
        }

        .creatorQuickActions {
          grid-template-columns:
            repeat(2,minmax(0,1fr)) !important;

          gap:8px !important;
        }

        .creatorQuickActions button {
          min-height:73px !important;

          border:
            1px solid rgba(255,255,255,.07) !important;

          border-radius:17px !important;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.035),
              rgba(126,75,255,.035)
            ) !important;
        }

        .creatorQuickActions .creatorPrimary {
          grid-column:
            1 / -1 !important;

          color:#07120f !important;

          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #91f4dc 55%,
              #9b86ff
            ) !important;
        }

        /*
           ABOUT
        */

        .about {
          gap:8px !important;
        }

        .about article {
          border:
            1px solid rgba(255,255,255,.07) !important;

          border-radius:18px !important;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.035),
              rgba(124,75,255,.025)
            ) !important;
        }

        /*
           MOBILE
        */

        @media(max-width:600px) {

          .hero {
            min-height:390px !important;

            padding:
              168px 13px 22px !important;

            border-radius:
              0 0 25px 25px !important;
          }

          .identity {
            display:flex !important;
            flex-direction:column !important;
            align-items:flex-start !important;
            justify-content:flex-end !important;
            gap:0 !important;
          }

          .avatar {
            width:88px !important;
            height:88px !important;

            border-radius:27px !important;
          }

          .avatar img,
          .avatar > span {
            border-radius:23px !important;
          }

          .identityText h1 {
            font-size:
              clamp(24px,8vw,33px) !important;
          }

          .bio {
            font-size:10px !important;
          }

          .socialActions {
            gap:6px !important;
          }

          .socialActions button {
            min-height:41px !important;

            padding:
              0 7px !important;

            font-size:8px !important;
          }

          .profileMusicBar {
            width:
              calc(100% - 20px) !important;
          }

          .stats {
            width:
              calc(100% - 20px) !important;
          }

          .top8Spotlight {
            width:
              calc(100% - 20px) !important;
          }

          .creatorDashboard.open {
            width:
              calc(100% - 20px) !important;
          }

          .content {
            width:
              calc(100% - 14px) !important;
          }
        }

        /* UTV PROFILE 3.0 — SOCIAL LUXURY */

        `}</style>
    </main>
  );
}

function CrewGrid({
  crew,
  router,
}: {
  crew: any[];
  router: ReturnType<typeof useRouter>;
}) {
  if (!crew.length) {
    return (
      <div className="empty">
        <span>👥</span>
        <h3>Top 8 coming soon.</h3>
        <p>This creator hasn't selected their Top 8 yet.</p>

        <style jsx>{`
          .empty {
            padding: 36px 20px;
            border: 1px dashed rgba(255,255,255,.15);
            border-radius: 25px;
            color: rgba(255,255,255,.5);
            text-align: center;
          }

          .empty span {
            font-size: 38px;
          }

          .empty h3 {
            margin-bottom: 5px;
            color: white;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crewGrid">
      {crew.slice(0, 8).map((person) => (
        <button
          key={person.email}
          onClick={() =>
            router.push(
              `/u/${encodeURIComponent(person.email)}`
            )
          }
        >
          <div className="photo">
            {person.avatar ? (
              <img src={person.avatar} alt={person.name} />
            ) : (
              <span>{person.name.slice(0, 1)}</span>
            )}
          </div>

          <b>{person.name}</b>
          <small>@{person.username}</small>
        </button>
      ))}

      <style jsx>{`
        .crewGrid {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
        }

        .crewGrid button {
          min-width: 0;
          padding: 10px 5px 13px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 19px;
          color: white;
          background: rgba(255,255,255,.045);
        }

        .photo {
          width: 58px;
          height: 58px;
          margin: auto;
          padding: 3px;
          border-radius: 19px;
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff,#ff5baa);
        }

        .photo img,
        .photo span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border: 3px solid #080d16;
          border-radius: 16px;
          object-fit: cover;
          color: #061510;
          background:
            linear-gradient(135deg,#53f4cd,#8e83ff);
          font-size: 22px;
          font-weight: 1000;
        }

        .crewGrid b,
        .crewGrid small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .crewGrid b {
          margin-top: 7px;
          font-size: 10px;
        }

        .crewGrid small {
          margin-top: 2px;
          color: rgba(255,255,255,.4);
          font-size: 8px;
        }

        @media (min-width: 700px) {
          .crewGrid {
            grid-template-columns: repeat(8,minmax(0,1fr));
          }
        }
      `}</style>
    </div>
  );
}

function MediaGrid({
  items,
  router,
}: {
  items: any[];
  router: ReturnType<typeof useRouter>;
}) {
  if (!items.length) {
    return (
      <div className="emptyMedia">
        <span>🎬</span>
        <h3>No posts yet.</h3>

        <style jsx>{`
          .emptyMedia {
            padding: 42px 20px;
            border: 1px dashed rgba(255,255,255,.15);
            border-radius: 25px;
            color: rgba(255,255,255,.5);
            text-align: center;
          }

          .emptyMedia span {
            font-size: 38px;
          }

          .emptyMedia h3 {
            color: white;
          }

          .utvBadgeRow {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 7px;
            margin-top: 9px;
            margin-bottom: 2px;
          }

          .utvBadge {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            min-height: 25px;
            padding: 5px 9px;
            border-radius: 999px;
            font-size: 10px;
            line-height: 1;
            font-weight: 900;
            letter-spacing: .65px;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
          }

          .utvBadge::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            pointer-events: none;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.16),
              inset 0 -1px 0 rgba(0,0,0,.28);
          }

          .ceoBadge {
            color: #fff4bc;
            border: 1px solid rgba(255,211,92,.48);
            background:
              linear-gradient(
                135deg,
                rgba(145,92,15,.72),
                rgba(43,27,5,.92)
              );
            box-shadow:
              0 5px 18px rgba(255,177,30,.12),
              inset 0 0 18px rgba(255,208,78,.08);
          }

          .ceoBadge .badgeIcon {
            color: #ffd76a;
            font-size: 12px;
            text-shadow:
              0 0 10px rgba(255,207,78,.45);
          }

          .ogBadge {
            color: #eafff9;
            border: 1px solid rgba(82,247,200,.38);
            background:
              linear-gradient(
                135deg,
                rgba(20,68,62,.9),
                rgba(45,29,89,.88)
              );
            box-shadow:
              0 5px 20px rgba(82,247,200,.08),
              inset 0 0 18px rgba(123,97,255,.06);
          }

          .ogBadge b {
            color: #77f8d3;
            font-weight: 950;
          }

          .ogStar {
            color: #76f7d2;
            font-size: 12px;
            text-shadow:
              0 0 10px rgba(82,247,200,.48);
          }

          .ogFoundersDrop {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns:
              42px minmax(0,1fr) auto;
            align-items: center;
            gap: 12px;
            margin: 14px 14px 2px;
            padding: 14px;
            border: 1px solid rgba(82,247,200,.16);
            border-radius: 20px;
            background:
              linear-gradient(
                135deg,
                rgba(11,20,27,.96),
                rgba(15,11,31,.96)
              );
            box-shadow:
              0 15px 45px rgba(0,0,0,.24),
              inset 0 1px 0 rgba(255,255,255,.04);
          }

          .ogFoundersGlow {
            position: absolute;
            width: 130px;
            height: 130px;
            left: -55px;
            top: -60px;
            border-radius: 50%;
            background: rgba(82,247,200,.1);
            filter: blur(30px);
            pointer-events: none;
          }

          .ogFoundersIcon {
            position: relative;
            z-index: 1;
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 14px;
            color: #6ff6cf;
            font-size: 20px;
            border: 1px solid rgba(82,247,200,.18);
            background:
              linear-gradient(
                145deg,
                rgba(82,247,200,.14),
                rgba(123,97,255,.09)
              );
          }

          .ogFoundersCopy {
            position: relative;
            z-index: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .ogFoundersCopy small {
            color: #65f5ce;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1.25px;
          }

          .ogFoundersCopy strong {
            color: #fff;
            font-size: 13px;
            line-height: 1.25;
          }

          .ogFoundersCopy span {
            color: rgba(255,255,255,.48);
            font-size: 10px;
            line-height: 1.35;
          }

          .ogCounter {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: baseline;
            gap: 2px;
            color: #fff;
            font-size: 20px;
            font-weight: 950;
            letter-spacing: -1px;
          }

          .ogCounter small {
            color: rgba(255,255,255,.38);
            font-size: 9px;
            letter-spacing: 0;
          }

          @media (max-width: 520px) {
            .ogFoundersDrop {
              margin-left: 10px;
              margin-right: 10px;
            }

            .ogFoundersCopy span {
              display: none;
            }
          }


          /* ==========================================
             UTV OG FIRST 100 — ANIMATED COLLECTIBLE
             ========================================== */

          .ogBadge {
            isolation: isolate;
            transform: translateZ(0);
            animation:
              ogBadgeFloat 3.2s ease-in-out infinite,
              ogBadgeGlow 2.4s ease-in-out infinite alternate;
          }

          .ogBadge::before {
            content: "";
            position: absolute;
            top: -40%;
            bottom: -40%;
            left: -55%;
            width: 32%;
            z-index: 0;
            pointer-events: none;
            transform: rotate(18deg);
            background:
              linear-gradient(
                90deg,
                transparent,
                rgba(255,255,255,.06),
                rgba(255,255,255,.58),
                rgba(111,246,207,.28),
                transparent
              );
            filter: blur(.3px);
            animation:
              ogBadgeShine 3.6s cubic-bezier(.4,0,.2,1) infinite;
          }

          .ogBadge > * {
            position: relative;
            z-index: 2;
          }

          .ogBadge .ogStar {
            display: inline-block;
            transform-origin: center;
            animation:
              ogStarPulse 1.8s ease-in-out infinite;
          }

          .ogBadge b {
            position: relative;
            z-index: 2;
            text-shadow:
              0 0 7px rgba(82,247,200,.42),
              0 0 14px rgba(123,97,255,.18);
            animation:
              ogNumberGlow 2.2s ease-in-out infinite alternate;
          }

          @keyframes ogBadgeShine {
            0% {
              transform:
                translateX(-180%)
                rotate(18deg);
              opacity: 0;
            }

            12% {
              opacity: 1;
            }

            42% {
              opacity: .9;
            }

            60%,
            100% {
              transform:
                translateX(520%)
                rotate(18deg);
              opacity: 0;
            }
          }

          @keyframes ogBadgeFloat {
            0%,
            100% {
              transform:
                translateY(0)
                scale(1);
            }

            50% {
              transform:
                translateY(-1.5px)
                scale(1.015);
            }
          }

          @keyframes ogBadgeGlow {
            from {
              box-shadow:
                0 5px 18px rgba(82,247,200,.07),
                0 0 0 rgba(123,97,255,0),
                inset 0 0 18px rgba(123,97,255,.05);
            }

            to {
              box-shadow:
                0 6px 24px rgba(82,247,200,.18),
                0 0 18px rgba(123,97,255,.10),
                inset 0 0 22px rgba(82,247,200,.08);
            }
          }

          @keyframes ogStarPulse {
            0%,
            100% {
              transform:
                scale(1)
                rotate(0deg);
              filter: brightness(1);
            }

            50% {
              transform:
                scale(1.22)
                rotate(8deg);
              filter: brightness(1.35);
            }
          }

          @keyframes ogNumberGlow {
            from {
              color: #77f8d3;
            }

            to {
              color: #b7ffea;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .ogBadge,
            .ogBadge::before,
            .ogBadge .ogStar,
            .ogBadge b {
              animation: none !important;
            }
          }

        `}</style>
      </div>
    );
  }

  return (
    <div className="mediaGrid">
      {items.map((item) => {
        const image = pick(item, [
          "thumbnail_url",
          "cover_url",
          "image_url",
          "poster_url",
        ]);

        const video = pick(item, [
          "video_url",
          "file_url",
          "media_url",
          "url",
        ]);

        return (
          <button
            key={item.id || item.created_at}
            onClick={() => {
              if (item.id) {
                router.push(`/watch/${item.id}`);
              } else if (video) {
                window.open(video, "_blank");
              }
            }}
          >
            {image ? (
              <img
                src={image}
                alt={pick(item, ["title"], "UTV post")}
              />
            ) : video ? (
              <video
                src={video}
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <span>UTV</span>
            )}

            <i />

            <b>
              {pick(item, ["title", "name"], "UTV post")}
            </b>
          </button>
        );
      })}

      <style jsx>{`
        .mediaGrid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 9px;
        }

        .mediaGrid button {
          position: relative;
          min-height: 220px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 22px;
          padding: 0;
          color: white;
          background: #090d15;
          text-align: left;
        }

        .mediaGrid img,
        .mediaGrid video,
        .mediaGrid > button > span {
          width: 100%;
          height: 100%;
          min-height: 220px;
          display: grid;
          place-items: center;
          object-fit: cover;
          background:
            linear-gradient(135deg,#8259ff,#050812);
          font-size: 32px;
          font-weight: 1000;
        }

        .mediaGrid i {
          position: absolute;
          inset: 45% 0 0;
          background:
            linear-gradient(transparent,rgba(0,0,0,.92));
        }

        .mediaGrid b {
          position: absolute;
          right: 12px;
          bottom: 12px;
          left: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        @media (min-width: 680px) {
          .mediaGrid {
            grid-template-columns: repeat(3,minmax(0,1fr));
          }
        }
      
/* ==========================================================
   UTV OG FIRST 100 — 3D COLLECTIBLE CREST
   ========================================================== */

.ogBadge,
.utvOgBadge,
.ogCollectibleBadge {
  position: relative !important;
  isolation: isolate;
  overflow: hidden !important;
  min-height: 54px !important;
  padding: 7px 15px 7px 13px !important;
  border: 1px solid rgba(255,255,255,.34) !important;
  border-radius: 16px !important;
  background:
    linear-gradient(145deg,
      rgba(255,255,255,.28) 0%,
      rgba(82,247,200,.22) 18%,
      rgba(15,19,28,.96) 42%,
      rgba(126,91,255,.28) 72%,
      rgba(255,255,255,.18) 100%) !important;
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.48),
    inset 0 -8px 16px rgba(0,0,0,.45),
    0 8px 20px rgba(0,0,0,.34),
    0 0 18px rgba(82,247,200,.12) !important;
  transform: perspective(500px) rotateX(3deg) !important;
  transform-style: preserve-3d;
}

.ogBadge::before,
.utvOgBadge::before,
.ogCollectibleBadge::before {
  content: "";
  position: absolute;
  inset: 2px;
  z-index: -1;
  border-radius: 13px;
  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 0 15px rgba(82,247,200,.13),
    inset 0 0 24px rgba(126,91,255,.10);
}

.ogBadge::after,
.utvOgBadge::after,
.ogCollectibleBadge::after {
  content: "";
  position: absolute;
  top: -60%;
  left: -45%;
  width: 32%;
  height: 220%;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,.72),
    transparent
  );
  transform: rotate(18deg);
  animation: utvOgShine 4.2s ease-in-out infinite;
}

.ogBadge span,
.utvOgBadge span,
.ogCollectibleBadge span {
  position: relative;
  z-index: 2;
  font-weight: 950 !important;
  letter-spacing: .9px !important;
  text-shadow:
    0 1px 0 rgba(255,255,255,.30),
    0 2px 4px rgba(0,0,0,.65),
    0 0 10px rgba(82,247,200,.22);
}

@keyframes utvOgShine {
  0%, 66% { left: -45%; opacity: 0; }
  72% { opacity: .85; }
  88% { left: 125%; opacity: .28; }
  100% { left: 125%; opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ogBadge::after,
  .utvOgBadge::after,
  .ogCollectibleBadge::after {
    animation: none !important;
  }
}



/* UTV OG FIRST 100 — TRUE 3D SHIELD */

.ogShieldBadge {
  position: relative;
  width: 76px;
  height: 84px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  isolation: isolate;
  transform-style: preserve-3d;
  filter:
    drop-shadow(0 10px 10px rgba(0,0,0,.48))
    drop-shadow(0 0 12px rgba(82,247,200,.22));
  animation: ogShieldFloat 3.8s ease-in-out infinite;
}

.ogShieldBadge::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;

  clip-path: polygon(
    50% 0%,
    91% 14%,
    88% 57%,
    76% 76%,
    50% 100%,
    24% 76%,
    12% 57%,
    9% 14%
  );

  background:
    linear-gradient(
      145deg,
      #ffffff 0%,
      #9fffe3 10%,
      #356e64 23%,
      #111820 43%,
      #7663d5 68%,
      #d6ceff 83%,
      #4ff1c1 100%
    );

  box-shadow:
    inset 0 2px 2px rgba(255,255,255,.95),
    inset 6px 0 12px rgba(255,255,255,.16),
    inset -8px -10px 15px rgba(0,0,0,.68);
}

.ogShieldBadge::after {
  content: "";
  position: absolute;
  z-index: 5;
  top: 2px;
  bottom: 6px;
  left: -35%;
  width: 26%;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.92),
      rgba(112,255,218,.42),
      transparent
    );
  transform: skewX(-18deg);
  animation: ogShieldSweep 4.2s ease-in-out infinite;
}

.ogShieldInner {
  position: relative;
  z-index: 2;
  width: 64px;
  height: 71px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  clip-path: polygon(
    50% 0%,
    90% 15%,
    86% 55%,
    74% 73%,
    50% 94%,
    26% 73%,
    14% 55%,
    10% 15%
  );

  background:
    radial-gradient(
      circle at 35% 16%,
      rgba(255,255,255,.24),
      transparent 27%
    ),
    linear-gradient(
      160deg,
      #182228 0%,
      #07100f 44%,
      #17251f 64%,
      #151126 100%
    );

  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.16),
    inset 0 0 19px rgba(82,247,200,.12),
    inset 0 -12px 16px rgba(0,0,0,.55);

  transform: translateZ(8px);
}

.ogShieldUTV {
  color: #fff;
  font-size: 16px;
  font-weight: 1000;
  letter-spacing: -1px;
  line-height: 1;
  text-shadow:
    0 2px 3px rgba(0,0,0,.8),
    0 0 12px rgba(82,247,200,.34);
}

.ogShieldOG {
  margin-top: 3px;
  color: #69f5cf;
  font-size: 12px;
  font-weight: 1000;
  letter-spacing: 2px;
  line-height: 1;
  text-shadow:
    0 0 10px rgba(82,247,200,.62);
}

.ogShieldNumber {
  margin-top: 5px;
  color: #dcd6ff;
  font-size: 10px;
  font-weight: 1000;
  line-height: 1;
  text-shadow:
    0 0 9px rgba(129,101,255,.7);
}

@keyframes ogShieldFloat {
  0%,100% {
    transform:
      perspective(650px)
      rotateX(4deg)
      rotateY(-5deg)
      translateY(0);
  }

  50% {
    transform:
      perspective(650px)
      rotateX(1deg)
      rotateY(5deg)
      translateY(-3px);
  }
}

@keyframes ogShieldSweep {
  0%,68% {
    left: -35%;
    opacity: 0;
  }

  73% {
    opacity: .9;
  }

  88% {
    left: 118%;
    opacity: .25;
  }

  100% {
    left: 118%;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ogShieldBadge,
  .ogShieldBadge::after {
    animation: none !important;
  }
}



/* =========================================================
   UTV ORIGINAL 100 — PREMIUM GOLD OG EMBLEM
   ========================================================= */

.utvRealOgBadge {
  position: relative !important;
  width: 72px !important;
  height: 78px !important;
  flex: 0 0 72px !important;
  display: inline-grid !important;
  place-items: center !important;
  overflow: visible !important;
  margin-left: 4px !important;
  vertical-align: middle !important;

  filter:
    drop-shadow(0 8px 7px rgba(0,0,0,.60))
    drop-shadow(0 0 8px rgba(255,190,35,.30)) !important;

  transform:
    perspective(600px)
    rotateX(3deg)
    rotateY(-4deg);

  transform-style: preserve-3d;
  animation: utvOgBadgeHover 3.6s ease-in-out infinite;
}

.utvOgOuterShield {
  position: absolute !important;
  inset: 0 !important;
  display: grid !important;
  place-items: center !important;

  clip-path: polygon(
    50% 0%,
    87% 10%,
    100% 28%,
    92% 67%,
    76% 84%,
    50% 100%,
    24% 84%,
    8% 67%,
    0% 28%,
    13% 10%
  );

  background:
    linear-gradient(
      135deg,
      #fff4b0 0%,
      #c98c13 15%,
      #fff0a0 29%,
      #8a5605 46%,
      #f8c64d 67%,
      #6b4003 82%,
      #ffd96a 100%
    ) !important;

  box-shadow:
    inset 0 2px 2px rgba(255,255,255,.85),
    inset 0 -8px 12px rgba(74,40,0,.68),
    inset 5px 0 8px rgba(255,220,110,.32) !important;
}

.utvOgOuterShield::before {
  content: "";
  position: absolute;
  inset: 4px;

  clip-path: inherit;

  background:
    linear-gradient(
      160deg,
      #121212 0%,
      #050505 36%,
      #171106 62%,
      #000 100%
    );

  box-shadow:
    inset 0 0 0 1px rgba(255,215,104,.42),
    inset 0 0 15px rgba(255,186,36,.10);
}

.utvOgOuterShield::after {
  content: "";
  position: absolute;
  z-index: 5;
  top: -12%;
  left: -50%;
  width: 25%;
  height: 130%;

  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.92),
      rgba(255,220,118,.48),
      transparent
    );

  transform: rotate(18deg);
  animation: utvOgGoldSweep 4.3s ease-in-out infinite;
}

.utvOgInnerShield {
  position: relative !important;
  z-index: 2 !important;

  width: 60px !important;
  height: 66px !important;

  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;

  clip-path: polygon(
    50% 0%,
    88% 11%,
    96% 29%,
    87% 63%,
    72% 79%,
    50% 94%,
    28% 79%,
    13% 63%,
    4% 29%,
    12% 11%
  );

  background:
    radial-gradient(
      circle at 32% 18%,
      rgba(255,218,104,.20),
      transparent 25%
    ),
    linear-gradient(
      155deg,
      #17130c,
      #030303 43%,
      #151006 72%,
      #050505
    ) !important;

  box-shadow:
    inset 0 0 0 1px rgba(255,209,78,.22),
    inset 0 -10px 14px rgba(0,0,0,.80) !important;

  transform: translateZ(8px);
}

.utvOgCrown {
  position: absolute !important;
  top: 5px !important;

  color: #ffd75e !important;
  font-size: 12px !important;
  line-height: 1 !important;

  text-shadow:
    0 0 5px rgba(255,196,37,.90),
    0 2px 2px rgba(0,0,0,.9) !important;
}

.utvOgBrand {
  margin-top: 9px !important;

  color: #f6ce59 !important;
  font-size: 11px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
  letter-spacing: -.4px !important;

  text-shadow:
    0 1px 0 #fff0a0,
    0 2px 2px #000,
    0 0 7px rgba(255,194,31,.50) !important;
}

.utvOgLetters {
  margin-top: 2px !important;

  color: #ffd55a !important;
  font-size: 23px !important;
  line-height: .94 !important;
  font-weight: 1000 !important;
  letter-spacing: -1.6px !important;

  text-shadow:
    0 1px 0 #fff4b0,
    0 3px 2px #5f3700,
    0 0 8px rgba(255,188,24,.55) !important;
}

.utvOgSerial {
  margin-top: 3px !important;

  color: rgba(255,239,184,.92) !important;
  font-size: 7px !important;
  line-height: 1 !important;
  font-weight: 950 !important;
  letter-spacing: 1px !important;
}

@keyframes utvOgGoldSweep {
  0%, 68% {
    left: -50%;
    opacity: 0;
  }

  73% {
    opacity: 1;
  }

  89% {
    left: 125%;
    opacity: .24;
  }

  100% {
    left: 125%;
    opacity: 0;
  }
}

@keyframes utvOgBadgeHover {
  0%,100% {
    transform:
      perspective(600px)
      rotateX(3deg)
      rotateY(-4deg)
      translateY(0);
  }

  50% {
    transform:
      perspective(600px)
      rotateX(1deg)
      rotateY(4deg)
      translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .utvRealOgBadge,
  .utvOgOuterShield::after {
    animation: none !important;
  }
}

`}</style>
    </div>
  );
}
