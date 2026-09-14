"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import UTVNav from "../../components/UTVNav";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const CITY_FALLBACKS: Record<string, Coordinates> = {
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

async function mapboxLookup(
  searchText: string
): Promise<Coordinates | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const query =
      encodeURIComponent(searchText);

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&types=poi,address,place,locality&access_token=${MAPBOX_TOKEN}`
    );

    if (!response.ok) {
      return null;
    }

    const json =
      await response.json();

    const center =
      json?.features?.[0]?.center;

    if (
      !Array.isArray(center) ||
      center.length < 2
    ) {
      return null;
    }

    const longitude =
      Number(center[0]);

    const latitude =
      Number(center[1]);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

async function resolveEventCoordinates(
  city: string,
  state: string,
  location: string
): Promise<Coordinates | null> {
  const cleanCity =
    city.trim();

  const cleanState =
    state
      .trim()
      .replace(/\./g, "")
      .toUpperCase();

  const cleanLocation =
    location.trim();

  /*
    First try the exact venue/address.
    Example:
    Golden 1 Center, Sacramento, CA
  */
  if (cleanLocation) {
    const exact =
      await mapboxLookup(
        `${cleanLocation}, ${cleanCity}, ${cleanState}, USA`
      );

    if (exact) {
      return exact;
    }
  }

  /*
    If exact venue fails,
    fall back to the city.
  */
  const cityResult =
    await mapboxLookup(
      `${cleanCity}, ${cleanState}, USA`
    );

  if (cityResult) {
    return cityResult;
  }

  /*
    Final fallback for common
    UTV cities.
  */
  const key =
    `${cleanCity},${cleanState}`.toLowerCase();

  return CITY_FALLBACKS[key] || null;
}

export default function NewEventPage() {
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [city, setCity] =
    useState("");

  const [stateName, setStateName] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [eventDate, setEventDate] =
    useState("");

  const [ticketUrl, setTicketUrl] =
    useState("");

  const [flyer, setFlyer] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function createEvent() {
    if (loading) return;

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description.trim();

    const cleanCity =
      city.trim();

    const cleanState =
      stateName
        .trim()
        .replace(/\./g, "")
        .toUpperCase();

    const cleanLocation =
      location.trim();

    const cleanTicketUrl =
      ticketUrl.trim();

    if (!cleanTitle) {
      setMessage(
        "Add an event title."
      );

      return;
    }

    if (!cleanCity) {
      setMessage(
        "Add the event city."
      );

      return;
    }

    if (!cleanState) {
      setMessage(
        "Add the event state."
      );

      return;
    }

    if (!eventDate) {
      setMessage(
        "Add the event date."
      );

      return;
    }

    setLoading(true);
    setMessage(
      "Preparing your event..."
    );

    try {
      const {
        data: userData,
      } =
        await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href =
          "/login";

        return;
      }

      const creatorEmail =
        userData.user.email || "";

      let flyerUrl = "";

      /*
        Keep the current working
        flyer upload.
      */
      if (flyer) {
        setMessage(
          "Uploading event flyer..."
        );

        const safeName =
          flyer.name
            .replaceAll(" ", "-")
            .replace(
              /[^a-zA-Z0-9._-]/g,
              ""
            )
            .toLowerCase();

        const fileName =
          `events/${Date.now()}-${safeName}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("uploads")
            .upload(
              fileName,
              flyer
            );

        if (uploadError) {
          throw new Error(
            `Flyer upload failed: ${uploadError.message}`
          );
        }

        flyerUrl =
          supabase.storage
            .from("uploads")
            .getPublicUrl(
              fileName
            )
            .data.publicUrl;
      }

      setMessage(
        cleanLocation
          ? "Finding the event venue on UTV World..."
          : "Finding the event city on UTV World..."
      );

      const coordinates =
        await resolveEventCoordinates(
          cleanCity,
          cleanState,
          cleanLocation
        );

      /*
        Save the event normally.
      */
      const {
        data: eventRow,
        error: eventError,
      } =
        await supabase
          .from("events")
          .insert({
            creator_email:
              creatorEmail,

            title:
              cleanTitle,

            description:
              cleanDescription,

            city:
              cleanCity,

            state:
              cleanState,

            location:
              cleanLocation,

            event_date:
              eventDate,

            flyer_url:
              flyerUrl,

            ticket_url:
              cleanTicketUrl,
          })
          .select("id")
          .single();

      if (eventError) {
        throw eventError;
      }

      setMessage(
        "Dropping your event into UTV World..."
      );

      /*
        Public UTV World signal.
        Exact venue/address is public
        for Events.

        If venue is blank:
        Sacramento, CA

        If venue exists:
        Golden 1 Center
      */
      const publicLocation =
        cleanLocation ||
        `${cleanCity}, ${cleanState}`;

      const {
        error: worldError,
      } =
        await supabase
          .from("world_posts")
          .insert({
            creator_email:
              creatorEmail,

            contact_email:
              creatorEmail,

            title:
              cleanTitle,

            description:
              cleanDescription,

            world_type:
              "Events",

            category:
              "Events",

            city:
              cleanCity,

            state:
              cleanState,

            location:
              publicLocation,

            latitude:
              coordinates?.latitude ??
              null,

            longitude:
              coordinates?.longitude ??
              null,

            media_url:
              flyerUrl,

            flyer_url:
              flyerUrl,

            link_url:
              cleanTicketUrl,

            is_live:
              false,

            status:
              "active",

            source_type:
              "event",

            source_id:
              eventRow.id,
          });

      if (worldError) {
        console.error(
          "UTV World event pin error:",
          worldError
        );

        setMessage(
          `Event posted, but the World pin had a problem: ${worldError.message}`
        );

        setLoading(false);
        return;
      }

      setMessage(
        "🎉 Event is live in UTV World!"
      );

      window.setTimeout(() => {
        window.location.href =
          "/world";
      }, 650);
    } catch (error: any) {
      console.error(
        "Create event error:",
        error
      );

      setMessage(
        error?.message ||
          "Could not post this event."
      );

      setLoading(false);
    }
  }

  return (
    <main className="eventPage">
      <UTVNav />

      <section className="eventWrap">
        <header className="eventHeader">
          <div className="eventSignal">
            <span />
            UTV WORLD EVENT
          </div>

          <h1>
            Put your event on the map.
          </h1>

          <p>
            Parties, premieres, pop-ups,
            showcases, meetups and experiences
            can appear inside UTV World.
          </p>
        </header>

        <section className="eventCard">
          <label>
            EVENT
          </label>

          <input
            className="eventInput"
            placeholder="Event title"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
          />

          <textarea
            className="eventInput eventTextarea"
            placeholder="What's happening?"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
          />

          <label>
            CITY & STATE
          </label>

          <div className="locationRow">
            <input
              className="eventInput"
              placeholder="Sacramento"
              value={city}
              onChange={(event) =>
                setCity(
                  event.target.value
                )
              }
            />

            <input
              className="eventInput stateInput"
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
            VENUE / ADDRESS — OPTIONAL
          </label>

          <input
            className="eventInput"
            placeholder="Golden 1 Center or full address"
            value={location}
            onChange={(event) =>
              setLocation(
                event.target.value
              )
            }
          />

          <div className="pinNote">
            📍 Add a venue or address for a more
            accurate UTV World pin. Leave it blank
            and UTV will place the event by city.
          </div>

          <label>
            EVENT DATE
          </label>

          <input
            className="eventInput"
            type="date"
            value={eventDate}
            onChange={(event) =>
              setEventDate(
                event.target.value
              )
            }
          />

          <label>
            TICKETS / RSVP
          </label>

          <input
            className="eventInput"
            placeholder="Ticket / RSVP link optional"
            value={ticketUrl}
            onChange={(event) =>
              setTicketUrl(
                event.target.value
              )
            }
          />

          <label>
            EVENT FLYER
          </label>

          <label className="flyerPicker">
            <div className="flyerIcon">
              🎉
            </div>

            <div>
              <strong>
                {flyer
                  ? flyer.name
                  : "Choose event flyer"}
              </strong>

              <span>
                JPG, PNG or image
              </span>
            </div>

            <b>
              ＋
            </b>

            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setFlyer(
                  event.target.files?.[0] ||
                  null
                )
              }
            />
          </label>

          <button
            className="postEventButton"
            onClick={createEvent}
            disabled={loading}
          >
            {loading
              ? "Dropping Event Signal..."
              : "🎉 Post Event to UTV"}
          </button>

          {message && (
            <div className="eventMessage">
              {message}
            </div>
          )}
        </section>

        <section className="worldPreview">
          <div className="previewPin">
            🎉
          </div>

          <div>
            <strong>
              Event → UTV World
            </strong>

            <p>
              Your flyer, location and event
              details become a discoverable
              World signal.
            </p>
          </div>
        </section>
      </section>

      <style jsx>{`
        .eventPage {
          min-height: 100vh;
          padding-bottom: 125px;
          color: white;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(155,124,255,.15),
              transparent 28%
            ),
            radial-gradient(
              circle at 100% 18%,
              rgba(82,247,200,.10),
              transparent 31%
            ),
            #050609;
        }

        .eventWrap {
          width:
            min(
              650px,
              calc(100% - 26px)
            );
          margin: 0 auto;
          padding-top: 24px;
        }

        .eventHeader {
          padding:
            8px 4px 22px;
        }

        .eventSignal {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 13px;
          color: #b7a5ff;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 1.8px;
        }

        .eventSignal span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9b7cff;
          box-shadow:
            0 0 13px #9b7cff;
          animation:
            eventPulse 1.5s infinite;
        }

        .eventHeader h1 {
          max-width: 590px;
          margin: 0;
          font-size:
            clamp(
              38px,
              9vw,
              62px
            );
          line-height: .96;
          letter-spacing: -2.4px;
        }

        .eventHeader p {
          max-width: 540px;
          margin: 15px 0 0;
          color:
            rgba(255,255,255,.58);
          font-size: 15px;
          line-height: 1.55;
        }

        .eventCard {
          padding: 17px;
          border:
            1px solid
            rgba(255,255,255,.10);
          border-radius: 29px;
          background:
            rgba(10,11,16,.94);
          box-shadow:
            0 28px 70px
            rgba(0,0,0,.42);
        }

        label {
          display: block;
          margin:
            5px 5px 8px;
          color:
            rgba(255,255,255,.43);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 1.3px;
        }

        .eventInput {
          width: 100%;
          min-height: 58px;
          box-sizing: border-box;
          margin-bottom: 17px;
          padding: 0 17px;
          color: white;
          border:
            1px solid
            rgba(255,255,255,.12);
          border-radius: 20px;
          outline: none;
          background:
            rgba(5,6,10,.96);
          font: inherit;
          font-size: 16px;
        }

        .eventInput:focus {
          border-color:
            rgba(155,124,255,.62);
          box-shadow:
            0 0 0 3px
            rgba(155,124,255,.08);
        }

        .eventTextarea {
          min-height: 125px;
          padding-top: 16px;
          resize: vertical;
          line-height: 1.45;
        }

        .locationRow {
          display: grid;
          grid-template-columns:
            minmax(0,1fr) 100px;
          gap: 10px;
        }

        .pinNote {
          margin:
            -8px 5px 18px;
          color:
            rgba(255,255,255,.39);
          font-size: 11px;
          line-height: 1.45;
        }

        .flyerPicker {
          min-height: 72px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 18px;
          padding: 12px 14px;
          color: white;
          border:
            1px dashed
            rgba(155,124,255,.35);
          border-radius: 19px;
          background:
            linear-gradient(
              100deg,
              rgba(155,124,255,.08),
              rgba(82,247,200,.04)
            );
          cursor: pointer;
        }

        .flyerPicker input {
          display: none;
        }

        .flyerIcon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background:
            rgba(155,124,255,.12);
          font-size: 22px;
        }

        .flyerPicker > div:nth-child(2) {
          min-width: 0;
          flex: 1;
          display: grid;
          gap: 3px;
        }

        .flyerPicker strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .flyerPicker span {
          color:
            rgba(255,255,255,.38);
          font-size: 10px;
        }

        .flyerPicker b {
          font-size: 24px;
        }

        .postEventButton {
          width: 100%;
          min-height: 62px;
          border: 0;
          border-radius: 999px;
          color: #07100c;
          background:
            linear-gradient(
              100deg,
              #9b7cff,
              #72d8f4 48%,
              #52f7c8
            );
          box-shadow:
            0 18px 44px
            rgba(125,105,255,.18);
          font-size: 17px;
          font-weight: 950;
          cursor: pointer;
        }

        .postEventButton:disabled {
          opacity: .55;
          cursor: default;
        }

        .eventMessage {
          margin-top: 14px;
          padding: 13px 15px;
          color:
            rgba(255,255,255,.84);
          border:
            1px solid
            rgba(255,255,255,.08);
          border-radius: 15px;
          background:
            rgba(255,255,255,.035);
          font-size: 12px;
          line-height: 1.45;
        }

        .worldPreview {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          padding: 14px 16px;
          border:
            1px solid
            rgba(255,255,255,.07);
          border-radius: 20px;
          background:
            rgba(255,255,255,.025);
        }

        .previewPin {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            rgba(155,124,255,.10);
          box-shadow:
            0 0 24px
            rgba(155,124,255,.15);
          font-size: 22px;
          animation:
            eventFloat 2s
            ease-in-out infinite alternate;
        }

        .worldPreview strong {
          font-size: 13px;
        }

        .worldPreview p {
          margin: 4px 0 0;
          color:
            rgba(255,255,255,.40);
          font-size: 11px;
          line-height: 1.4;
        }

        @keyframes eventPulse {
          50% {
            opacity: .4;
            transform: scale(.7);
          }
        }

        @keyframes eventFloat {
          to {
            transform:
              translateY(-4px);
          }
        }

        @media(max-width: 520px) {
          .eventWrap {
            width:
              calc(100% - 22px);
          }

          .eventCard {
            padding: 14px;
            border-radius: 25px;
          }

          .locationRow {
            grid-template-columns:
              minmax(0,1fr) 90px;
          }
        }
      `}</style>
    </main>
  );
}
