"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import UTVNav from "../components/UTVNav";
import { supabase } from "../../lib/supabaseClient";

export default function MePage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [profile, setProfile] =
    useState<any>(null);

  const [messages, setMessages] =
    useState(0);

  const [activity, setActivity] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userEmail =
      session?.user?.email || "";

    if (!userEmail) {
      router.replace("/login");
      return;
    }

    setEmail(userEmail);

    const [
      profileResult,
      messageResult,
      activityResult,
    ] = await Promise.all([
      supabase
        .from("creator_profiles")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle(),

      supabase
        .from("messages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "receiver_email",
          userEmail
        )
        .eq("read", false),

      supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_email",
          userEmail
        )
        .eq("is_read", false),
    ]);

    setProfile(
      profileResult.data || null
    );

    setMessages(
      messageResult.count || 0
    );

    setActivity(
      activityResult.count || 0
    );

    setLoading(false);
  }

  const name =
    profile?.display_name ||
    profile?.creator_name ||
    profile?.username ||
    email.split("@")[0] ||
    "UTV Creator";

  const username =
    profile?.username ||
    email.split("@")[0] ||
    "creator";

  const avatar =
    profile?.avatar_url ||
    profile?.creator_avatar ||
    profile?.profile_image ||
    "";

  const profileHref =
    email
      ? `/u/${encodeURIComponent(
          email
        )}`
      : "/profile-pro-v12";

  return (
    <main className="mePage">
      <UTVNav />

      <div className="ambient green" />
      <div className="ambient purple" />
      <div className="ambient pink" />

      <section className="meHero">
        <small>YOUR UTV</small>

        <h1>Me</h1>

        <p>
          Your people, messages,
          bookings, creator tools and
          everything connected to you.
        </p>
      </section>

      {loading ? (
        <section className="loadingCard">
          <div className="loadingAvatar" />

          <div className="loadingLines">
            <span />
            <span />
          </div>
        </section>
      ) : (
        <Link
          href={profileHref}
          className="identityCard"
        >
          <div className="identityGlow" />

          <div className="avatar">
            {avatar ? (
              <img
                src={avatar}
                alt=""
              />
            ) : (
              name
                .slice(0, 1)
                .toUpperCase()
            )}
          </div>

          <div className="identityCopy">
            <small>
              VIEW MY PROFILE
            </small>

            <strong>
              {name}
            </strong>

            <span>
              @{username}
            </span>
          </div>

          <b>›</b>
        </Link>
      )}

      <section className="priorityRow">
        <Link
          href="/messages"
          className="priorityCard messages"
        >
          <div className="priorityIcon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M4 5.5h16v11H9l-5 3v-14Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <small>CONNECT</small>
            <strong>Messages</strong>
            <span>Your conversations</span>
          </div>

          {messages > 0 && (
            <em>
              {messages > 99
                ? "99+"
                : messages}
            </em>
          )}
        </Link>

        <Link
          href="/activity"
          className="priorityCard activity"
        >
          <div className="priorityIcon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 3a5 5 0 0 0-5 5v3.5L5 15h14l-2-3.5V8a5 5 0 0 0-5-5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M10 18h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <small>WHAT'S NEW</small>
            <strong>Activity</strong>
            <span>Likes, follows + more</span>
          </div>

          {activity > 0 && (
            <em>
              {activity > 99
                ? "99+"
                : activity}
            </em>
          )}
        </Link>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <small>MY UTV</small>
          <h2>Everything you need</h2>
        </div>

        <div className="toolGrid">
          <Link
            href="/bookings"
            className="tool bookings"
          >
            <span className="toolIcon">
              ◆
            </span>

            <strong>Bookings</strong>

            <small>
              Requests + services
            </small>
          </Link>

          <Link
            href="/studio"
            className="tool studio"
          >
            <span className="toolIcon">
              ▣
            </span>

            <strong>
              Creator Studio
            </strong>

            <small>
              Content + analytics
            </small>
          </Link>

          <Link
            href="/top-crew"
            className="tool crew"
          >
            <span className="toolIcon top8">
              8
            </span>

            <strong>Top 8</strong>

            <small>
              Your closest crew
            </small>
          </Link>

          <Link
            href="/settings"
            className="tool settings"
          >
            <span className="toolIcon">
              ⚙
            </span>

            <strong>Settings</strong>

            <small>
              Account + alerts
            </small>
          </Link>
        </div>
      </section>

      <Link
        href="/walkie"
        className="walkiePanel"
      >
        <div className="walkieArt">
          <span className="antenna" />

          <div className="radioBody">
            <div className="radioScreen">
              <i />
              <b>UTV</b>
            </div>

            <div className="speaker">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>

            <span className="ptt">
              PTT
            </span>
          </div>
        </div>

        <div className="walkieCopy">
          <small>
            UTV SIGNATURE
          </small>

          <strong>
            Walkie Talkie
          </strong>

          <span>
            Tap in instantly with
            your people.
          </span>
        </div>

        <b className="walkieArrow">
          ›
        </b>
      </Link>

      <style jsx>{`
        .mePage {
          position:relative;
          min-height:100svh;
          overflow:hidden;

          padding:
            88px 14px 125px;

          color:white;

          background:
            radial-gradient(
              circle at 8% 6%,
              rgba(82,247,200,.11),
              transparent 29%
            ),
            radial-gradient(
              circle at 94% 30%,
              rgba(118,78,255,.17),
              transparent 31%
            ),
            radial-gradient(
              circle at 24% 88%,
              rgba(255,63,173,.07),
              transparent 28%
            ),
            #03050b;
        }

        .ambient {
          position:absolute;
          pointer-events:none;

          width:190px;
          height:190px;

          border-radius:50%;

          filter:blur(72px);

          opacity:.17;
        }

        .ambient.green {
          left:-95px;
          top:340px;
          background:#52f7c8;
        }

        .ambient.purple {
          right:-100px;
          top:590px;
          background:#7550ff;
        }

        .ambient.pink {
          left:30%;
          bottom:90px;
          background:#ff44b0;
        }

        .meHero,
        .identityCard,
        .priorityRow,
        .section,
        .walkiePanel,
        .loadingCard {
          position:relative;
          z-index:2;

          width:min(100%,700px);

          margin-inline:auto;
        }

        .meHero > small {
          color:#52f7c8;

          font-size:8px;
          font-weight:1000;

          letter-spacing:.16em;
        }

        h1 {
          margin:4px 0 0;

          font-size:
            clamp(
              46px,
              13vw,
              72px
            );

          line-height:.9;

          letter-spacing:-.075em;
        }

        .meHero p {
          max-width:340px;

          margin:12px 0 0;

          color:
            rgba(
              255,
              255,
              255,
              .49
            );

          font-size:11px;

          line-height:1.5;
        }

        .identityCard {
          min-height:108px;

          margin-top:25px;

          display:grid;

          grid-template-columns:
            68px
            minmax(0,1fr)
            auto;

          align-items:center;

          gap:13px;

          overflow:hidden;

          padding:13px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .105
            );

          border-radius:25px;

          color:white;

          text-decoration:none;

          background:
            linear-gradient(
              135deg,
              rgba(
                82,
                247,
                200,
                .075
              ),
              rgba(
                118,
                81,
                255,
                .11
              ),
              rgba(
                255,
                70,
                180,
                .05
              )
            );

          box-shadow:
            inset 0 1px 0
            rgba(
              255,
              255,
              255,
              .055
            ),
            0 22px 55px
            rgba(
              0,
              0,
              0,
              .24
            );
        }

        .identityGlow {
          position:absolute;

          right:-30px;
          top:-65px;

          width:150px;
          height:150px;

          border-radius:50%;

          background:#7650ff;

          filter:blur(40px);

          opacity:.15;
        }

        .avatar {
          width:68px;
          height:68px;

          overflow:hidden;

          display:grid;

          place-items:center;

          border:
            2px solid
            rgba(
              82,
              247,
              200,
              .6
            );

          border-radius:22px;

          background:
            linear-gradient(
              145deg,
              #171d2c,
              #080b12
            );

          box-shadow:
            0 0 0 4px
            rgba(
              82,
              247,
              200,
              .055
            );

          font-size:24px;

          font-weight:1000;
        }

        .avatar img {
          width:100%;
          height:100%;

          object-fit:cover;
        }

        .identityCopy {
          min-width:0;
        }

        .identityCopy small {
          display:block;

          color:#52f7c8;

          font-size:6px;

          font-weight:1000;

          letter-spacing:.13em;
        }

        .identityCopy strong {
          display:block;

          overflow:hidden;

          margin-top:4px;

          white-space:nowrap;

          text-overflow:ellipsis;

          font-size:21px;

          letter-spacing:-.035em;
        }

        .identityCopy span {
          display:block;

          margin-top:3px;

          color:
            rgba(
              255,
              255,
              255,
              .45
            );

          font-size:9px;
        }

        .identityCard > b {
          position:relative;

          z-index:2;

          color:
            rgba(
              255,
              255,
              255,
              .4
            );

          font-size:27px;
        }

        .priorityRow {
          display:grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );

          gap:9px;

          margin-top:10px;
        }

        .priorityCard {
          position:relative;

          min-height:92px;

          display:grid;

          grid-template-columns:
            39px minmax(0,1fr);

          align-items:center;

          gap:9px;

          overflow:hidden;

          padding:11px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .075
            );

          border-radius:20px;

          color:white;

          text-decoration:none;
        }

        .priorityCard.messages {
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(
                70,
                205,
                255,
                .19
              ),
              transparent 47%
            ),
            #091018;
        }

        .priorityCard.activity {
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(
                255,
                67,
                180,
                .17
              ),
              transparent 47%
            ),
            #100b16;
        }

        .priorityIcon {
          width:39px;
          height:39px;

          display:grid;

          place-items:center;

          border-radius:13px;

          background:
            rgba(
              255,
              255,
              255,
              .065
            );

          color:
            rgba(
              255,
              255,
              255,
              .86
            );
        }

        .priorityIcon svg {
          width:22px;
          height:22px;
        }

        .priorityCard small {
          display:block;

          color:
            rgba(
              255,
              255,
              255,
              .36
            );

          font-size:6px;

          font-weight:1000;

          letter-spacing:.11em;
        }

        .priorityCard strong {
          display:block;

          margin-top:3px;

          font-size:13px;
        }

        .priorityCard div span {
          display:block;

          margin-top:3px;

          color:
            rgba(
              255,
              255,
              255,
              .38
            );

          font-size:7px;
        }

        .priorityCard em {
          position:absolute;

          top:8px;
          right:8px;

          min-width:19px;
          height:19px;

          padding:0 5px;

          display:grid;

          place-items:center;

          border-radius:999px;

          color:#030907;

          background:#52f7c8;

          font-size:8px;

          font-style:normal;

          font-weight:1000;
        }

        .section {
          margin-top:29px;
        }

        .sectionTitle small {
          color:
            rgba(
              255,
              255,
              255,
              .36
            );

          font-size:7px;

          font-weight:1000;

          letter-spacing:.14em;
        }

        .sectionTitle h2 {
          margin:4px 0 12px;

          font-size:21px;

          letter-spacing:-.035em;
        }

        .toolGrid {
          display:grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );

          gap:9px;
        }

        .tool {
          min-height:120px;

          display:flex;

          flex-direction:column;

          justify-content:flex-end;

          padding:13px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .07
            );

          border-radius:21px;

          color:white;

          text-decoration:none;

          box-shadow:
            inset 0 1px 0
            rgba(
              255,
              255,
              255,
              .03
            );
        }

        .toolIcon {
          width:34px;
          height:34px;

          display:grid;

          place-items:center;

          margin-bottom:auto;

          border-radius:11px;

          background:
            rgba(
              255,
              255,
              255,
              .07
            );

          font-size:15px;

          font-weight:1000;
        }

        .toolIcon.top8 {
          color:#ffd86b;
        }

        .tool strong {
          display:block;

          font-size:12px;
        }

        .tool small {
          display:block;

          margin-top:4px;

          color:
            rgba(
              255,
              255,
              255,
              .38
            );

          font-size:8px;
        }

        .bookings {
          background:
            linear-gradient(
              145deg,
              rgba(
                82,
                247,
                200,
                .085
              ),
              rgba(
                255,
                255,
                255,
                .018
              )
            );
        }

        .studio {
          background:
            linear-gradient(
              145deg,
              rgba(
                118,
                82,
                255,
                .12
              ),
              rgba(
                255,
                255,
                255,
                .018
              )
            );
        }

        .crew {
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                191,
                53,
                .085
              ),
              rgba(
                255,
                255,
                255,
                .018
              )
            );
        }

        .settings {
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                68,
                177,
                .075
              ),
              rgba(
                255,
                255,
                255,
                .018
              )
            );
        }

        .walkiePanel {
          min-height:105px;

          margin-top:11px;

          display:grid;

          grid-template-columns:
            61px
            minmax(0,1fr)
            auto;

          align-items:center;

          gap:12px;

          overflow:hidden;

          padding:12px 14px;

          border:
            1px solid
            rgba(
              82,
              247,
              200,
              .13
            );

          border-radius:22px;

          color:white;

          text-decoration:none;

          background:
            radial-gradient(
              circle at 90% 10%,
              rgba(
                82,
                247,
                200,
                .12
              ),
              transparent 40%
            ),
            linear-gradient(
              135deg,
              #071514,
              #090b14
            );
        }

        .walkieArt {
          position:relative;

          width:53px;
          height:77px;
        }

        .antenna {
          position:absolute;

          right:8px;
          top:0;

          width:5px;
          height:21px;

          border-radius:
            4px 4px 1px 1px;

          background:
            linear-gradient(
              #52f7c8,
              #414958
            );

          transform:rotate(7deg);

          box-shadow:
            0 0 11px
            rgba(
              82,
              247,
              200,
              .28
            );
        }

        .radioBody {
          position:absolute;

          left:3px;
          bottom:0;

          width:45px;
          height:59px;

          overflow:hidden;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .16
            );

          border-radius:
            9px 9px 13px 13px;

          background:
            linear-gradient(
              150deg,
              #272c3a,
              #080a10 64%,
              #171328
            );

          box-shadow:
            inset 0 1px 0
            rgba(
              255,
              255,
              255,
              .11
            );
        }

        .radioScreen {
          position:absolute;

          top:6px;
          left:6px;
          right:6px;

          height:14px;

          display:flex;

          align-items:center;

          justify-content:center;

          gap:4px;

          border:
            1px solid
            rgba(
              82,
              247,
              200,
              .22
            );

          border-radius:4px;

          color:#52f7c8;

          background:
            rgba(
              82,
              247,
              200,
              .065
            );
        }

        .radioScreen i {
          width:4px;
          height:4px;

          border-radius:50%;

          background:#52f7c8;

          box-shadow:
            0 0 7px #52f7c8;
        }

        .radioScreen b {
          font-size:6px;

          letter-spacing:.08em;
        }

        .speaker {
          position:absolute;

          left:8px;
          right:8px;
          top:27px;

          display:grid;

          grid-template-columns:
            repeat(3,1fr);

          gap:3px;
        }

        .speaker i {
          width:5px;
          height:5px;

          margin:auto;

          border-radius:50%;

          background:
            rgba(
              255,
              255,
              255,
              .2
            );
        }

        .ptt {
          position:absolute;

          left:11px;
          right:11px;
          bottom:5px;

          height:11px;

          display:grid;

          place-items:center;

          border-radius:4px;

          color:white;

          background:
            linear-gradient(
              90deg,
              #6953ff,
              #b344ff
            );

          font-size:5px;

          font-weight:1000;

          letter-spacing:.09em;
        }

        .walkieCopy small {
          display:block;

          color:#52f7c8;

          font-size:6px;

          font-weight:1000;

          letter-spacing:.12em;
        }

        .walkieCopy strong {
          display:block;

          margin-top:4px;

          font-size:15px;
        }

        .walkieCopy span {
          display:block;

          margin-top:3px;

          color:
            rgba(
              255,
              255,
              255,
              .43
            );

          font-size:8px;
        }

        .walkieArrow {
          color:
            rgba(
              255,
              255,
              255,
              .38
            );

          font-size:27px;
        }

        .loadingCard {
          height:108px;

          margin-top:25px;

          display:grid;

          grid-template-columns:
            68px 1fr;

          align-items:center;

          gap:13px;

          padding:13px;

          border-radius:25px;

          background:
            rgba(
              255,
              255,
              255,
              .035
            );
        }

        .loadingAvatar {
          width:68px;
          height:68px;

          border-radius:22px;

          background:
            rgba(
              255,
              255,
              255,
              .06
            );
        }

        .loadingLines {
          display:grid;
          gap:9px;
        }

        .loadingLines span {
          width:62%;
          height:13px;

          border-radius:99px;

          background:
            rgba(
              255,
              255,
              255,
              .06
            );
        }

        .loadingLines span + span {
          width:38%;
          height:9px;
        }

        @media(
          min-width:700px
        ) {
          .mePage {
            padding-inline:22px;
          }

          .toolGrid {
            grid-template-columns:
              repeat(
                4,
                minmax(0,1fr)
              );
          }
        }
      `}</style>
    </main>
  );
}
