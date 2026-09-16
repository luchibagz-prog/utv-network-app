"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import UTVNav from "../../components/UTVNav";
import { supabase } from "../../../lib/supabaseClient";

type Person = {
  email: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export default function NewMessagePage() {
  const router = useRouter();

  const [myEmail, setMyEmail] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [people, setPeople] =
    useState<Person[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const email =
        user.email.toLowerCase();

      setMyEmail(email);
      setReady(true);

      const params =
        new URLSearchParams(
          window.location.search
        );

      const target =
        params.get("to");

      if (
        target &&
        target.toLowerCase() !== email
      ) {
        router.replace(
          `/messages/${encodeURIComponent(
            target
          )}`
        );
      }
    }

    void boot();
  }, [router]);

  async function searchPeople(
    value: string
  ) {
    setQuery(value);

    const clean =
      value
        .replace(
          /[%(),]/g,
          " "
        )
        .trim();

    if (!clean) {
      setPeople([]);
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("creator_profiles")
        .select(
          "email,display_name,username,avatar_url"
        )
        .or(
          `display_name.ilike.%${clean}%,username.ilike.%${clean}%`
        )
        .neq(
          "email",
          myEmail
        )
        .limit(15);

      if (error) {
        throw error;
      }

      setPeople(
        (data || []) as Person[]
      );
    } catch (error) {
      console.error(
        "UTV people search:",
        error
      );

      setPeople([]);
    } finally {
      setLoading(false);
    }
  }

  function nameFor(
    person: Person
  ) {
    return (
      person.display_name?.trim() ||
      person.username?.trim() ||
      "UTV Creator"
    );
  }

  function usernameFor(
    person: Person
  ) {
    return (
      person.username?.trim() ||
      "creator"
    );
  }

  return (
    <main className="newMessagePage">
      <UTVNav />

      <section className="shell">
        <header>
          <button
            type="button"
            className="back"
            onClick={() =>
              router.back()
            }
          >
            ‹
          </button>

          <div>
            <span>
              UTV MESSAGES
            </span>

            <h1>
              New Message
            </h1>
          </div>
        </header>

        <label className="search">
          <span>⌕</span>

          <input
            autoFocus
            value={query}
            onChange={(event) =>
              void searchPeople(
                event.target.value
              )
            }
            placeholder="Search name or @username"
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPeople([]);
              }}
            >
              ×
            </button>
          )}
        </label>

        {!ready || loading ? (
          <div className="state">
            <div className="spinner" />

            <strong>
              {ready
                ? "Finding people…"
                : "Opening UTV…"}
            </strong>
          </div>
        ) : query &&
          people.length === 0 ? (
          <div className="state">
            <span className="big">
              👥
            </span>

            <strong>
              No creators found
            </strong>

            <p>
              Try another display
              name or @username.
            </p>
          </div>
        ) : !query ? (
          <div className="state">
            <span className="big">
              💬
            </span>

            <strong>
              Who do you want to message?
            </strong>

            <p>
              Search UTV by
              display name or username.
            </p>
          </div>
        ) : (
          <section className="people">
            {people.map(
              (person) => {
                const name =
                  nameFor(
                    person
                  );

                return (
                  <button
                    type="button"
                    key={
                      person.email
                    }
                    className="person"
                    onClick={() =>
                      router.push(
                        `/messages/${encodeURIComponent(
                          person.email
                        )}`
                      )
                    }
                  >
                    <span className="avatar">
                      {person.avatar_url ? (
                        <img
                          src={
                            person.avatar_url
                          }
                          alt=""
                        />
                      ) : (
                        <b>
                          {name
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase()}
                        </b>
                      )}
                    </span>

                    <span className="copy">
                      <strong>
                        {name}
                      </strong>

                      <small>
                        @
                        {usernameFor(
                          person
                        )}
                      </small>
                    </span>

                    <span className="arrow">
                      ›
                    </span>
                  </button>
                );
              }
            )}
          </section>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .newMessagePage {
          min-height: 100dvh;
          padding-bottom:
            calc(
              110px +
              env(
                safe-area-inset-bottom
              )
            );
          color: #fff;
          background:
            radial-gradient(
              circle at 12% 0%,
              rgba(82,247,200,.13),
              transparent 29%
            ),
            radial-gradient(
              circle at 92% 6%,
              rgba(126,87,255,.18),
              transparent 31%
            ),
            #03050a;
        }

        .shell {
          width:
            min(
              calc(100% - 20px),
              720px
            );
          margin: 0 auto;
          padding:
            21px 0 32px;
        }

        header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding:
            4px 2px 20px;
        }

        .back {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border:
            1px solid
            rgba(255,255,255,.10);
          border-radius: 50%;
          color: #fff;
          background:
            rgba(255,255,255,.045);
          font-size: 29px;
        }

        header span {
          display: block;
          margin-bottom: 3px;
          color: #61f5d0;
          font-size: 8px;
          font-weight: 950;
          letter-spacing:
            .17em;
        }

        h1 {
          margin: 0;
          font-size: 26px;
          line-height: 1;
          letter-spacing:
            -.04em;
        }

        .search {
          min-height: 50px;
          display: grid;
          grid-template-columns:
            30px
            minmax(0,1fr)
            32px;
          align-items: center;
          padding:
            0 9px 0 13px;
          border:
            1px solid
            rgba(255,255,255,.09);
          border-radius: 18px;
          background:
            rgba(255,255,255,.045);
          box-shadow:
            inset 0 1px 0
            rgba(255,255,255,.025);
        }

        .search > span {
          color: #63f5d1;
          font-size: 23px;
        }

        .search input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #fff;
          background:
            transparent;
          font-size: 13px;
        }

        .search input::placeholder {
          color:
            rgba(255,255,255,.34);
        }

        .search button {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 50%;
          color: #fff;
          background:
            rgba(255,255,255,.06);
          font-size: 18px;
        }

        .people {
          display: grid;
          margin-top: 13px;
        }

        .person {
          width: 100%;
          display: grid;
          grid-template-columns:
            55px
            minmax(0,1fr)
            20px;
          align-items: center;
          gap: 11px;
          padding:
            10px 5px;
          border: 0;
          border-bottom:
            1px solid
            rgba(255,255,255,.065);
          color: #fff;
          background:
            transparent;
          text-align: left;
        }

        .person:hover {
          background:
            rgba(255,255,255,.025);
        }

        .avatar {
          width: 53px;
          height: 53px;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 2px;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #8068ff 62%,
              #ff315d
            );
        }

        .avatar img,
        .avatar b {
          width: 49px;
          height: 49px;
          display: grid;
          place-items: center;
          border:
            3px solid #05070b;
          border-radius: 50%;
          object-fit: cover;
          background: #0c1017;
        }

        .copy {
          min-width: 0;
          display: block;
        }

        .copy strong,
        .copy small {
          display: block;
          overflow: hidden;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        .copy strong {
          font-size: 14px;
          font-weight: 950;
        }

        .copy small {
          margin-top: 4px;
          color:
            rgba(255,255,255,.44);
          font-size: 10px;
        }

        .arrow {
          color:
            rgba(255,255,255,.3);
          font-size: 24px;
        }

        .state {
          min-height: 340px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          padding: 30px;
          text-align: center;
        }

        .state .big {
          font-size: 38px;
        }

        .state strong {
          font-size: 16px;
        }

        .state p {
          max-width: 260px;
          margin: 0;
          color:
            rgba(255,255,255,.43);
          font-size: 11px;
          line-height: 1.5;
        }

        .spinner {
          width: 42px;
          height: 42px;
          border:
            3px solid
            rgba(255,255,255,.08);
          border-top-color:
            #52f7c8;
          border-radius: 50%;
          animation:
            spin .8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
