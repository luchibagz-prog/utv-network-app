"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

type Person = {
  email: string;
  name: string;
  username: string;
  avatar: string;
};

function pick(
  row: any,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = row?.[key];

    if (value) {
      return String(value);
    }
  }

  return fallback;
}

export default function TopCrewPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [people, setPeople] =
    useState<Person[]>([]);

  const [slots, setSlots] =
    useState<(Person | null)[]>(
      Array(8).fill(null)
    );

  const [selected, setSelected] =
    useState<Person | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [notice, setNotice] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const ownerEmail =
        user.email.toLowerCase();

      setEmail(ownerEmail);

      const [
        followResult,
        topResult,
      ] = await Promise.all([
        supabase
          .from("follows")
          .select("following_email")
          .eq(
            "follower_email",
            ownerEmail
          ),

        supabase
          .from("top_crew")
          .select(
            "member_email,position"
          )
          .eq(
            "owner_email",
            ownerEmail
          )
          .order(
            "position",
            {
              ascending: true,
            }
          ),
      ]);

      const followedEmails =
        (followResult.data || [])
          .map((row: any) =>
            String(
              row.following_email || ""
            ).toLowerCase()
          )
          .filter(Boolean);

      const topRows =
        topResult.data || [];

      const existingEmails =
        topRows
          .map((row: any) =>
            String(
              row.member_email || ""
            ).toLowerCase()
          )
          .filter(Boolean);

      const allEmails =
        Array.from(
          new Set([
            ...followedEmails,
            ...existingEmails,
          ])
        ).filter(
          (personEmail) =>
            personEmail !== ownerEmail
        );

      if (!allEmails.length) {
        setPeople([]);
        setSlots(
          Array(8).fill(null)
        );
        setLoading(false);
        return;
      }

      const { data: profiles } =
        await supabase
          .from("creator_profiles")
          .select("*")
          .in(
            "email",
            allEmails
          );

      const profileMap =
        new Map(
          (profiles || []).map(
            (profile: any) => [
              String(
                profile.email || ""
              ).toLowerCase(),
              profile,
            ]
          )
        );

      const peopleList =
        allEmails.map(
          (personEmail) => {
            const profile =
              profileMap.get(
                personEmail
              ) || {};

            return {
              email:
                personEmail,

              name:
                pick(
                  profile,
                  [
                    "display_name",
                    "creator_name",
                    "username",
                  ],
                  "UTV Creator"
                ),

              username:
                pick(
                  profile,
                  ["username"],
                  "creator"
                ),

              avatar:
                pick(
                  profile,
                  [
                    "avatar_url",
                    "creator_avatar",
                    "profile_image",
                  ]
                ),
            };
          }
        );

      setPeople(peopleList);

      const personMap =
        new Map(
          peopleList.map(
            (person) => [
              person.email,
              person,
            ]
          )
        );

      const nextSlots:
        (Person | null)[] =
          Array(8).fill(null);

      topRows.forEach(
        (row: any) => {
          const slotIndex =
            Math.max(
              0,
              Math.min(
                7,
                Number(
                  row.position
                ) - 1
              )
            );

          const person =
            personMap.get(
              String(
                row.member_email ||
                ""
              ).toLowerCase()
            );

          if (person) {
            nextSlots[
              slotIndex
            ] = person;
          }
        }
      );

      setSlots(nextSlots);
    } catch (error) {
      console.error(
        "Top 8 load:",
        error
      );

      setNotice(
        "Could not load your Crew."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveOrder(
    nextSlots = slots
  ) {
    if (!email) return;

    setSaving(true);

    try {
      const rows: {
        owner_email: string;
        member_email: string;
        position: number;
      }[] = nextSlots.flatMap(
        (person, index) =>
          person
            ? [
                {
                  owner_email: email,
                  member_email: person.email,
                  position: index + 1,
                },
              ]
            : []
      );

      const { error: deleteError } =
        await supabase
          .from("top_crew")
          .delete()
          .eq(
            "owner_email",
            email
          );

      if (deleteError) {
        throw deleteError;
      }

      if (rows.length) {
        const {
          error: insertError,
        } = await supabase
          .from("top_crew")
          .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      setNotice(
        "Top 8 saved 🔥"
      );

      window.setTimeout(
        () => setNotice(""),
        1500
      );
    } catch (error: any) {
      console.error(
        "Top 8 save:",
        error
      );

      setNotice(
        error?.message ||
          "Could not save Top 8."
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignSlot(
    slotNumber: number
  ) {
    if (!selected) return;

    const destination =
      slotNumber - 1;

    const next =
      [...slots];

    const oldPosition =
      next.findIndex(
        (person) =>
          person?.email ===
          selected.email
      );

    const displaced =
      next[destination];

    if (
      oldPosition >= 0 &&
      oldPosition !==
        destination
    ) {
      next[
        oldPosition
      ] = displaced;
    }

    next[destination] =
      selected;

    setSlots(next);
    setSelected(null);

    try {
      navigator.vibrate?.(
        18
      );
    } catch {}

    await saveOrder(next);
  }

  async function removeSlot(
    index: number
  ) {
    const next =
      [...slots];

    next[index] = null;

    setSlots(next);

    await saveOrder(next);
  }

  const filteredPeople =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return people;
      }

      return people.filter(
        (person) =>
          person.name
            .toLowerCase()
            .includes(q) ||
          person.username
            .toLowerCase()
            .includes(q)
      );
    }, [
      people,
      search,
    ]);

  if (loading) {
    return (
      <main className="loading">
        <div className="loader" />
        <h2>
          Loading your Crew…
        </h2>

        <style jsx>{`
          .loading {
            min-height:100vh;
            display:grid;
            place-items:center;
            align-content:center;
            gap:15px;
            color:white;
            background:#03060c;
          }

          .loader {
            width:44px;
            height:44px;
            border:
              4px solid
              rgba(255,255,255,.1);
            border-top-color:
              #52f7c8;
            border-radius:50%;
            animation:
              spin .7s linear
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

  return (
    <main className="page">
      <UTVNav />

      <header className="topbar">
        <button
          onClick={() =>
            router.back()
          }
        >
          ‹
        </button>

        <div>
          <p>YOUR INNER CIRCLE</p>
          <h1>Top 8</h1>
        </div>

        <span>
          {slots.filter(Boolean).length}/8
        </span>
      </header>

      <section className="intro">
        <div>
          <p>UTV TOP 8</p>
          <h2>
            Who makes your circle?
          </h2>

          <span>
            Pick somebody from your
            Crew, then choose their
            number.
          </span>
        </div>

        <div className="bigEight">
          8
        </div>
      </section>

      <section className="slots">
        {slots.map(
          (
            person,
            index
          ) => (
            <article
              key={index}
              className={
                person
                  ? "slot filled"
                  : "slot"
              }
            >
              <div className="slotNumber">
                {index + 1}
              </div>

              {person ? (
                <>
                  <button
                    className="slotPerson"
                    onClick={() =>
                      router.push(
                        `/u/${encodeURIComponent(
                          person.email
                        )}`
                      )
                    }
                  >
                    <div className="avatar">
                      {person.avatar ? (
                        <img
                          src={
                            person.avatar
                          }
                          alt={
                            person.name
                          }
                        />
                      ) : (
                        <span>
                          {person.name
                            .slice(
                              0,
                              1
                            )
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
                    </div>
                  </button>

                  <button
                    className="remove"
                    onClick={() =>
                      void removeSlot(
                        index
                      )
                    }
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  className="emptySlot"
                  onClick={() => {
                    setNotice(
                      "Pick somebody below first."
                    );

                    window.setTimeout(
                      () =>
                        setNotice(
                          ""
                        ),
                      1200
                    );
                  }}
                >
                  <span>＋</span>
                  <small>
                    Open spot
                  </small>
                </button>
              )}
            </article>
          )
        )}
      </section>

      <section className="crewPicker">
        <div className="pickerHeading">
          <div>
            <p>YOUR CREW</p>
            <h2>
              Pick somebody
            </h2>
          </div>

          <span>
            {people.length}
          </span>
        </div>

        <div className="search">
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search your Crew"
          />
        </div>

        <div className="peopleGrid">
          {filteredPeople.map(
            (person) => {
              const selectedAlready =
                slots.some(
                  (slot) =>
                    slot?.email ===
                    person.email
                );

              return (
                <button
                  key={person.email}
                  className={
                    selectedAlready
                      ? "personCard chosen"
                      : "personCard"
                  }
                  onClick={() =>
                    setSelected(
                      person
                    )
                  }
                >
                  <div className="personAvatar">
                    {person.avatar ? (
                      <img
                        src={
                          person.avatar
                        }
                        alt={
                          person.name
                        }
                      />
                    ) : (
                      <span>
                        {person.name
                          .slice(0,1)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <strong>
                    {person.name}
                  </strong>

                  <small>
                    @{person.username}
                  </small>

                  {selectedAlready && (
                    <i>✓ Top 8</i>
                  )}
                </button>
              );
            }
          )}
        </div>

        {!filteredPeople.length && (
          <div className="emptyCrew">
            <span>👥</span>
            <b>
              No Crew found
            </b>
            <small>
              Follow creators first,
              then add them to your
              Top 8.
            </small>
          </div>
        )}
      </section>

      {selected && (
        <div
          className="slotBackdrop"
          onClick={() =>
            setSelected(null)
          }
        >
          <section
            className="slotSheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="handle" />

            <div className="selectedPerson">
              <div className="avatar big">
                {selected.avatar ? (
                  <img
                    src={
                      selected.avatar
                    }
                    alt={
                      selected.name
                    }
                  />
                ) : (
                  <span>
                    {selected.name
                      .slice(0,1)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <p>
                  CHOOSE A SPOT
                </p>

                <h2>
                  {selected.name}
                </h2>

                <small>
                  @{selected.username}
                </small>
              </div>
            </div>

            <div className="numberPicker">
              {Array.from({
                length: 8,
              }).map(
                (_, index) => {
                  const occupant =
                    slots[index];

                  return (
                    <button
                      key={index}
                      className={
                        occupant
                          ?.email ===
                        selected.email
                          ? "current"
                          : ""
                      }
                      onClick={() =>
                        void assignSlot(
                          index + 1
                        )
                      }
                    >
                      <strong>
                        {index + 1}
                      </strong>

                      <small>
                        {occupant
                          ? occupant.name
                          : "Open"}
                      </small>
                    </button>
                  );
                }
              )}
            </div>

            <p className="swapNote">
              If the spot is already
              taken, UTV swaps the
              positions for you.
            </p>

            <button
              className="cancel"
              onClick={() =>
                setSelected(null)
              }
            >
              Cancel
            </button>
          </section>
        </div>
      )}

      {notice && (
        <div className="notice">
          {saving
            ? "Saving Top 8…"
            : notice}
        </div>
      )}

      <style jsx>{`
        .page {
          min-height:100vh;
          padding-bottom:130px;
          color:white;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(82,247,200,.13),
              transparent 29%
            ),
            radial-gradient(
              circle at 90% 4%,
              rgba(123,97,255,.18),
              transparent 32%
            ),
            #03060c;
        }

        .topbar {
          position:sticky;
          top:0;
          z-index:100;
          display:grid;
          grid-template-columns:
            40px 1fr auto;
          align-items:center;
          gap:11px;
          padding:13px 14px;
          border-bottom:
            1px solid
            rgba(255,255,255,.06);
          background:
            rgba(3,6,12,.9);
          backdrop-filter:
            blur(22px);
        }

        .topbar button {
          width:40px;
          height:40px;
          border:0;
          border-radius:50%;
          color:white;
          background:
            rgba(255,255,255,.07);
          font-size:27px;
        }

        .topbar p,
        .intro p,
        .pickerHeading p,
        .selectedPerson p {
          margin:0;
          color:#52f7c8;
          font-size:8px;
          font-weight:1000;
          letter-spacing:.15em;
        }

        .topbar h1 {
          margin:2px 0 0;
          font-size:21px;
        }

        .topbar > span {
          padding:7px 10px;
          border-radius:999px;
          color:#07130f;
          background:#52f7c8;
          font-size:9px;
          font-weight:1000;
        }

        .intro {
          display:flex;
          align-items:center;
          justify-content:
            space-between;
          gap:14px;
          margin:13px;
          padding:18px;
          overflow:hidden;
          border:
            1px solid
            rgba(255,255,255,.09);
          border-radius:26px;
          background:
            linear-gradient(
              135deg,
              rgba(82,247,200,.08),
              rgba(123,97,255,.09)
            );
        }

        .intro h2 {
          margin:5px 0 4px;
          font-size:24px;
          letter-spacing:-.04em;
        }

        .intro span {
          color:
            rgba(255,255,255,.45);
          font-size:9px;
        }

        .bigEight {
          font-size:72px;
          font-weight:1000;
          line-height:.8;
          color:
            rgba(82,247,200,.19);
        }

        .slots {
          display:grid;
          grid-template-columns:
            repeat(4,1fr);
          gap:8px;
          padding:0 13px 16px;
        }

        .slot {
          position:relative;
          min-height:126px;
          overflow:hidden;
          border:
            1px solid
            rgba(255,255,255,.08);
          border-radius:20px;
          background:
            rgba(255,255,255,.025);
        }

        .slot.filled {
          background:
            linear-gradient(
              145deg,
              rgba(82,247,200,.06),
              rgba(123,97,255,.06)
            );
        }

        .slotNumber {
          position:absolute;
          z-index:4;
          top:7px;
          left:7px;
          width:25px;
          height:25px;
          display:grid;
          place-items:center;
          border-radius:50%;
          color:#07130f;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #a0ff77
            );
          font-size:10px;
          font-weight:1000;
        }

        .slotPerson,
        .emptySlot {
          width:100%;
          height:100%;
          min-height:126px;
          display:grid;
          place-items:center;
          align-content:center;
          gap:6px;
          padding:26px 6px 8px;
          border:0;
          color:white;
          background:transparent;
        }

        .slotPerson > div:last-child {
          min-width:0;
          display:grid;
          gap:1px;
          text-align:center;
        }

        .slotPerson strong {
          overflow:hidden;
          max-width:82px;
          font-size:8px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .slotPerson small,
        .emptySlot small {
          overflow:hidden;
          max-width:82px;
          color:
            rgba(255,255,255,.36);
          font-size:7px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .avatar {
          width:54px;
          height:54px;
          display:grid;
          place-items:center;
          padding:2px;
          border-radius:18px;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              #7567ff,
              #ff62b6
            );
        }

        .avatar img,
        .avatar span {
          width:100%;
          height:100%;
          display:grid;
          place-items:center;
          border:
            3px solid #070b12;
          border-radius:16px;
          object-fit:cover;
          color:#07120e;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              white
            );
          font-size:18px;
          font-weight:1000;
        }

        .remove {
          position:absolute;
          z-index:8;
          top:5px;
          right:5px;
          width:25px;
          height:25px;
          border:0;
          border-radius:50%;
          color:white;
          background:
            rgba(0,0,0,.55);
        }

        .emptySlot span {
          width:40px;
          height:40px;
          display:grid;
          place-items:center;
          border:
            1px dashed
            rgba(82,247,200,.30);
          border-radius:50%;
          color:#52f7c8;
          font-size:20px;
        }

        .crewPicker {
          margin:5px 13px;
          padding:16px;
          border:
            1px solid
            rgba(255,255,255,.08);
          border-radius:26px;
          background:
            rgba(255,255,255,.025);
        }

        .pickerHeading {
          display:flex;
          align-items:flex-end;
          justify-content:
            space-between;
          margin-bottom:12px;
        }

        .pickerHeading h2 {
          margin:4px 0 0;
          font-size:22px;
        }

        .pickerHeading > span {
          color:
            rgba(255,255,255,.35);
          font-size:10px;
        }

        .search {
          display:grid;
          grid-template-columns:
            auto 1fr;
          align-items:center;
          margin-bottom:13px;
          padding:0 12px;
          border:
            1px solid
            rgba(255,255,255,.08);
          border-radius:16px;
          background:
            rgba(0,0,0,.24);
        }

        .search span {
          color:#52f7c8;
          font-size:20px;
        }

        .search input {
          width:100%;
          box-sizing:border-box;
          padding:13px 10px;
          border:0;
          outline:0;
          color:white;
          background:transparent;
          font-size:11px;
        }

        .peopleGrid {
          display:grid;
          grid-template-columns:
            repeat(3,1fr);
          gap:8px;
        }

        .personCard {
          position:relative;
          min-width:0;
          display:grid;
          place-items:center;
          gap:5px;
          padding:10px 5px;
          border:
            1px solid
            rgba(255,255,255,.06);
          border-radius:18px;
          color:white;
          background:
            rgba(255,255,255,.025);
          text-align:center;
          transition:
            transform .15s ease,
            border-color .15s ease;
        }

        .personCard:active {
          transform:scale(.97);
        }

        .personCard.chosen {
          border-color:
            rgba(82,247,200,.35);
          background:
            rgba(82,247,200,.055);
        }

        .personAvatar {
          width:58px;
          height:58px;
          display:grid;
          place-items:center;
          padding:2px;
          border-radius:20px;
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
          width:100%;
          height:100%;
          display:grid;
          place-items:center;
          border:
            3px solid #070b12;
          border-radius:18px;
          object-fit:cover;
          color:#07120e;
          background:
            linear-gradient(
              135deg,
              #52f7c8,
              white
            );
          font-size:19px;
          font-weight:1000;
        }

        .personCard strong {
          overflow:hidden;
          width:100%;
          font-size:8px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .personCard small {
          overflow:hidden;
          width:100%;
          color:
            rgba(255,255,255,.36);
          font-size:7px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .personCard i {
          padding:3px 6px;
          border-radius:999px;
          color:#07130f;
          background:#52f7c8;
          font-size:6px;
          font-style:normal;
          font-weight:1000;
        }

        .emptyCrew {
          min-height:160px;
          display:grid;
          place-items:center;
          align-content:center;
          gap:5px;
          color:
            rgba(255,255,255,.42);
          text-align:center;
        }

        .emptyCrew span {
          font-size:30px;
        }

        .emptyCrew b {
          color:white;
          font-size:11px;
        }

        .emptyCrew small {
          font-size:8px;
        }

        .slotBackdrop {
          position:fixed;
          inset:0;
          z-index:9500;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          padding:12px;
          background:
            rgba(0,0,0,.74);
          backdrop-filter:blur(14px);
        }

        .slotSheet {
          width:min(100%,520px);
          padding:8px 14px 15px;
          border:
            1px solid
            rgba(255,255,255,.10);
          border-radius:28px;
          background:
            linear-gradient(
              180deg,
              #111722,
              #06090f
            );
          box-shadow:
            0 -30px 90px
            rgba(0,0,0,.55);
          animation:
            sheetUp .22s ease both;
        }

        @keyframes sheetUp {
          from {
            opacity:0;
            transform:
              translateY(30px);
          }

          to {
            opacity:1;
            transform:none;
          }
        }

        .handle {
          width:42px;
          height:4px;
          margin:1px auto 14px;
          border-radius:999px;
          background:
            rgba(255,255,255,.19);
        }

        .selectedPerson {
          display:grid;
          grid-template-columns:
            66px 1fr;
          align-items:center;
          gap:12px;
          padding:4px 3px 15px;
        }

        .avatar.big {
          width:66px;
          height:66px;
          border-radius:22px;
        }

        .avatar.big img,
        .avatar.big span {
          border-radius:20px;
        }

        .selectedPerson h2 {
          margin:4px 0 2px;
          font-size:23px;
        }

        .selectedPerson small {
          color:
            rgba(255,255,255,.42);
          font-size:9px;
        }

        .numberPicker {
          display:grid;
          grid-template-columns:
            repeat(4,1fr);
          gap:8px;
        }

        .numberPicker button {
          min-height:72px;
          display:grid;
          place-items:center;
          align-content:center;
          gap:4px;
          border:
            1px solid
            rgba(255,255,255,.08);
          border-radius:18px;
          color:white;
          background:
            rgba(255,255,255,.035);
        }

        .numberPicker button.current {
          border-color:#52f7c8;
          background:
            rgba(82,247,200,.10);
        }

        .numberPicker strong {
          font-size:22px;
          color:#52f7c8;
        }

        .numberPicker small {
          overflow:hidden;
          max-width:70px;
          color:
            rgba(255,255,255,.38);
          font-size:7px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .swapNote {
          margin:11px 0;
          color:
            rgba(255,255,255,.34);
          font-size:8px;
          text-align:center;
        }

        .cancel {
          width:100%;
          min-height:43px;
          border:0;
          border-radius:14px;
          color:white;
          background:
            rgba(255,255,255,.06);
          font-size:10px;
          font-weight:900;
        }

        .notice {
          position:fixed;
          z-index:9999;
          left:50%;
          bottom:110px;
          width:
            min(420px,
            calc(100% - 28px));
          padding:13px;
          border:
            1px solid
            rgba(82,247,200,.25);
          border-radius:17px;
          color:white;
          background:
            rgba(5,9,15,.96);
          transform:
            translateX(-50%);
          text-align:center;
          font-size:10px;
          font-weight:950;
        }

        @media(max-width:420px) {
          .slots {
            gap:6px;
          }

          .slot {
            min-height:116px;
          }

          .slotPerson,
          .emptySlot {
            min-height:116px;
          }

          .peopleGrid {
            grid-template-columns:
              repeat(3,1fr);
          }

          .personAvatar {
            width:52px;
            height:52px;
          }
        }

        @media(min-width:760px) {
          .page {
            max-width:780px;
            margin:auto;
          }
        }
      `}</style>
    </main>
  );
}
