"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const CITY_FALLBACKS: Record<
  string,
  Coordinates
> = {
  "sacramento,ca": {
    latitude: 38.5816,
    longitude: -121.4944,
  },

  "oakland,ca": {
    latitude: 37.8044,
    longitude: -122.2712,
  },

  "san francisco,ca": {
    latitude: 37.7749,
    longitude: -122.4194,
  },

  "san jose,ca": {
    latitude: 37.3382,
    longitude: -121.8863,
  },

  "stockton,ca": {
    latitude: 37.9577,
    longitude: -121.2908,
  },

  "modesto,ca": {
    latitude: 37.6391,
    longitude: -120.9969,
  },

  "fresno,ca": {
    latitude: 36.7378,
    longitude: -119.7871,
  },

  "visalia,ca": {
    latitude: 36.3302,
    longitude: -119.2921,
  },

  "bakersfield,ca": {
    latitude: 35.3733,
    longitude: -119.0187,
  },

  "los angeles,ca": {
    latitude: 34.0522,
    longitude: -118.2437,
  },

  "las vegas,nv": {
    latitude: 36.1699,
    longitude: -115.1398,
  },
};

async function locateCity(
  city: string,
  state: string
): Promise<Coordinates | null> {
  const cleanCity = city.trim();
  const cleanState = state
    .trim()
    .replace(/\./g, "")
    .toUpperCase();

  const fallbackKey =
    `${cleanCity},${cleanState}`.toLowerCase();

  const fallback =
    CITY_FALLBACKS[fallbackKey] || null;

  const token =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  if (!token) {
    return fallback;
  }

  try {
    const query = encodeURIComponent(
      `${cleanCity}, ${cleanState}, USA`
    );

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&types=place,locality&access_token=${token}`
    );

    if (!response.ok) {
      return fallback;
    }

    const result = await response.json();

    const center =
      result?.features?.[0]?.center;

    if (
      !Array.isArray(center) ||
      center.length < 2
    ) {
      return fallback;
    }

    const longitude =
      Number(center[0]);

    const latitude =
      Number(center[1]);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return fallback;
    }

    return {
      latitude,
      longitude,
    };
  } catch {
    return fallback;
  }
}

export default function NewCollabPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [city, setCity] =
    useState("");

  const [stateName, setStateName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [posting, setPosting] =
    useState(false);

  const [status, setStatus] =
    useState("");

  useEffect(() => {
    void loadUser();
  }, []);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.push("/login");
      return;
    }

    setEmail(
      user.email.trim().toLowerCase()
    );
  }

  async function postBuildRequest() {
    if (posting) return;

    setStatus("");

    const cleanTitle =
      title.trim();

    const cleanCity =
      city.trim();

    const cleanState =
      stateName
        .trim()
        .replace(/\./g, "")
        .toUpperCase();

    const cleanDescription =
      description.trim();

    if (!email) {
      setStatus(
        "Please sign in before posting."
      );

      return;
    }

    if (!cleanTitle) {
      setStatus(
        "Tell UTV what you are looking to build."
      );

      return;
    }

    if (!cleanCity) {
      setStatus(
        "Add your city so people can find your signal."
      );

      return;
    }

    if (!cleanState) {
      setStatus(
        "Add your state."
      );

      return;
    }

    setPosting(true);

    try {
      const coordinates =
        await locateCity(
          cleanCity,
          cleanState
        );

      const {
        data: worldPost,
        error,
      } = await supabase
        .from("world_posts")
        .insert({
          creator_email: email,

          contact_email: email,

          title: cleanTitle,

          description:
            cleanDescription ||
            "Tap in with me on UTV if you want to build.",

          world_type:
            "Build Together",

          category:
            "Build Together",

          city: cleanCity,

          state: cleanState,

          location:
            `${cleanCity}, ${cleanState}`,

          latitude:
            coordinates?.latitude ?? null,

          longitude:
            coordinates?.longitude ?? null,

          is_live: false,

          status: "active",
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setStatus(
        "🔥 Your Build Together signal is live in UTV World!"
      );

      setTitle("");
      setDescription("");

      window.setTimeout(() => {
        router.push("/world");
      }, 700);
    } catch (error: any) {
      console.error(
        "Build Together error:",
        error
      );

      setStatus(
        error?.message ||
          "Could not post your Build Together signal."
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="buildPage">
      <UTVNav />

      <section className="buildWrap">
        <header className="buildHeader">
          <div className="buildTag">
            <span className="signalDot" />
            UTV WORLD SIGNAL
          </div>

          <h1>
            What do you want to build?
          </h1>

          <p>
            Find creators, camera operators,
            artists, models, producers,
            businesses and people ready
            to work.
          </p>
        </header>

        <section className="buildCard">
          <label>
            WHAT DO YOU NEED?
          </label>

          <input
            className="buildInput"
            placeholder="Need a Camera Man"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
          />

          <label>
            SIGNAL TYPE
          </label>

          <div className="signalType">
            <div className="signalIcon">
              🤝
            </div>

            <div>
              <strong>
                Build Together
              </strong>

              <span>
                Shows as an animated pin
                in UTV World
              </span>
            </div>
          </div>

          <label>
            LOCATION
          </label>

          <div className="locationRow">
            <input
              className="buildInput"
              placeholder="Sacramento"
              value={city}
              onChange={(event) =>
                setCity(
                  event.target.value
                )
              }
            />

            <input
              className="buildInput stateInput"
              placeholder="CA"
              value={stateName}
              onChange={(event) =>
                setStateName(
                  event.target.value
                    .toUpperCase()
                    .slice(0, 2)
                )
              }
            />
          </div>

          <label>
            DETAILS
          </label>

          <textarea
            className="buildInput buildTextarea"
            placeholder="DM me... tell people what you're working on or who you're looking for."
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
          />

          <button
            type="button"
            className="buildButton"
            disabled={posting}
            onClick={
              postBuildRequest
            }
          >
            {posting
              ? "Dropping Signal..."
              : "🤝 Post Build Request"}
          </button>

          {status && (
            <div className="statusBox">
              {status}
            </div>
          )}
        </section>

        <div className="worldHint">
          <span>🌎</span>

          <div>
            <strong>
              Goes straight to UTV World
            </strong>

            <p>
              People can discover your
              Build Together signal by
              city and tap your pin.
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .buildPage {
          min-height: 100vh;
          padding-bottom: 125px;
          color: white;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(53, 247, 159, 0.11),
              transparent 29%
            ),
            radial-gradient(
              circle at 100% 12%,
              rgba(139, 92, 246, 0.16),
              transparent 31%
            ),
            #050609;
        }

        .buildWrap {
          width: min(
            650px,
            calc(100% - 28px)
          );
          margin: 0 auto;
          padding-top: 24px;
        }

        .buildHeader {
          padding: 8px 4px 22px;
        }

        .buildTag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          color: #62f6be;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .signalDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #39ff88;
          animation:
            signalPulse 1.4s infinite;
        }

        .buildHeader h1 {
          max-width: 570px;
          margin: 0;
          font-size: clamp(
            38px,
            9vw,
            62px
          );
          line-height: 0.96;
          letter-spacing: -2.5px;
        }

        .buildHeader p {
          max-width: 540px;
          margin: 15px 0 0;
          color:
            rgba(255,255,255,.62);
          font-size: 15px;
          line-height: 1.55;
        }

        .buildCard {
          padding: 17px;
          border:
            1px solid
            rgba(255,255,255,.11);
          border-radius: 29px;
          background:
            rgba(11,12,17,.93);
          box-shadow:
            0 28px 70px
            rgba(0,0,0,.42);
        }

        label {
          display: block;
          margin:
            5px 5px 8px;
          color:
            rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .buildInput {
          width: 100%;
          min-height: 58px;
          box-sizing: border-box;
          margin-bottom: 17px;
          padding: 0 17px;
          border:
            1px solid
            rgba(255,255,255,.13);
          border-radius: 20px;
          outline: none;
          color: white;
          background:
            rgba(5,6,10,.96);
          font: inherit;
          font-size: 16px;
        }

        .buildInput:focus {
          border-color:
            rgba(57,255,136,.58);
          box-shadow:
            0 0 0 3px
            rgba(57,255,136,.07);
        }

        .signalType {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 63px;
          box-sizing: border-box;
          margin-bottom: 17px;
          padding: 9px 14px;
          border:
            1px solid
            rgba(57,255,136,.20);
          border-radius: 20px;
          background:
            linear-gradient(
              100deg,
              rgba(57,255,136,.08),
              rgba(111,91,255,.07)
            );
        }

        .signalIcon {
          display: grid;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          place-items: center;
          border-radius: 14px;
          background:
            rgba(57,255,136,.11);
          font-size: 22px;
        }

        .signalType div:last-child {
          display: grid;
          gap: 3px;
        }

        .signalType strong {
          font-size: 15px;
        }

        .signalType span {
          color:
            rgba(255,255,255,.48);
          font-size: 12px;
        }

        .locationRow {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) 105px;
          gap: 11px;
        }

        .buildTextarea {
          min-height: 145px;
          padding-top: 16px;
          line-height: 1.45;
          resize: vertical;
        }

        .buildButton {
          width: 100%;
          min-height: 62px;
          border: 0;
          border-radius: 999px;
          color: #03100c;
          background:
            linear-gradient(
              100deg,
              #39f59d,
              #64dde8 48%,
              #895df7
            );
          box-shadow:
            0 17px 42px
            rgba(88,100,255,.20);
          font-size: 17px;
          font-weight: 950;
          cursor: pointer;
        }

        .buildButton:disabled {
          opacity: .55;
          cursor: default;
        }

        .statusBox {
          margin-top: 15px;
          padding: 13px 15px;
          border:
            1px solid
            rgba(255,255,255,.10);
          border-radius: 16px;
          color:
            rgba(255,255,255,.86);
          background:
            rgba(255,255,255,.04);
          font-size: 13px;
          line-height: 1.45;
        }

        .worldHint {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding: 14px 16px;
          border:
            1px solid
            rgba(255,255,255,.08);
          border-radius: 20px;
          background:
            rgba(255,255,255,.035);
        }

        .worldHint > span {
          font-size: 25px;
        }

        .worldHint strong {
          font-size: 13px;
        }

        .worldHint p {
          margin: 4px 0 0;
          color:
            rgba(255,255,255,.48);
          font-size: 12px;
          line-height: 1.4;
        }

        @keyframes signalPulse {
          0% {
            box-shadow:
              0 0 0 0
              rgba(57,255,136,.55);
          }

          70% {
            box-shadow:
              0 0 0 11px
              rgba(57,255,136,0);
          }

          100% {
            box-shadow:
              0 0 0 0
              rgba(57,255,136,0);
          }
        }

        @media(max-width: 520px) {
          .buildWrap {
            width:
              calc(100% - 22px);
          }

          .buildCard {
            padding: 14px;
            border-radius: 25px;
          }

          .locationRow {
            grid-template-columns:
              minmax(0, 1fr) 92px;
          }
        }
      `}</style>
    </main>
  );
}
