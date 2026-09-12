"use client";

import Link from "next/link";
import UTVNav from "../components/UTVNav";

const main = [
  {
    href: "/reels",
    icon: "⚡",
    tag: "FULL SCREEN",
    title: "Reels",
    text: "Quick hits, hidden gems and creators starting to move.",
    vibe: "pink",
  },
  {
    href: "/world",
    icon: "◎",
    tag: "LIVE CULTURE",
    title: "UTV World",
    text: "See Lives, events, creators and motion happening around you.",
    vibe: "mint",
  },
  {
    href: "/watch",
    icon: "▶",
    tag: "STREAM UTV",
    title: "Watch",
    text: "Shows, movies, music, podcasts and UTV originals.",
    vibe: "purple",
  },
];

const tools = [
  ["⌕", "Search", "Creators + content", "/search"],
  ["✦", "Events", "What's happening", "/events"],
  ["★", "Casting", "Find opportunities", "/casting"],
  ["∞", "Collab", "Build together", "/collabs/new"],
];

export default function DiscoverPage() {
  return (
    <main className="discoverPage">
      <UTVNav />

      <div className="ambient a1" />
      <div className="ambient a2" />

      <section className="discoverHero">
        <div>
          <small>UTV DISCOVER</small>
          <h1>
            What&apos;s <span>moving?</span>
          </h1>
          <p>Watch it. Find it. Tap in.</p>
        </div>

        <Link href="/search" className="searchOrb">
          ⌕
        </Link>
      </section>

      <section className="pulse">
        <i />
        <b>UTV PULSE</b>
        <span>
          🔥 Trending &nbsp;•&nbsp; ◎ Near You
          &nbsp;•&nbsp; ⚡ Rising
        </span>
      </section>

      <section className="discoverSection">
        <div className="sectionTitle">
          <div>
            <small>JUMP IN</small>
            <h2>Pick your vibe</h2>
          </div>
          <span>Swipe →</span>
        </div>

        <div className="featureRail">
          {main.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`feature ${item.vibe}`}
            >
              <div className="shine" />

              <span className="featureIcon">
                {item.icon}
              </span>

              <div className="featureText">
                <small>{item.tag}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>

              <b className="open">↗</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="discoverSection">
        <div className="sectionTitle">
          <div>
            <small>MORE UTV</small>
            <h2>Find your lane</h2>
          </div>
        </div>

        <div className="toolGrid">
          {tools.map(([icon, title, text, href]) => (
            <Link
              key={title}
              href={href}
              className="tool"
            >
              <span>{icon}</span>

              <div>
                <b>{title}</b>
                <small>{text}</small>
              </div>

              <i>›</i>
            </Link>
          ))}
        </div>
      </section>

      <section className="coming">
        <small>UTV NEXT</small>

        <h2>
          Discover is about to get
          <span> smarter.</span>
        </h2>

        <p>
          Motion, City Pulse, Collab Radar and
          personalized discovery are coming into
          this screen.
        </p>

        <div>
          <b>⚡ MOTION</b>
          <b>📡 RADAR</b>
          <b>🔥 CITY PULSE</b>
        </div>
      </section>

      <style jsx>{`
        .discoverPage{
          position:relative;
          min-height:100svh;
          overflow:hidden;
          padding:88px 14px 125px;
          color:white;
          background:
            radial-gradient(circle at 10% 5%,rgba(82,247,200,.12),transparent 27%),
            radial-gradient(circle at 92% 23%,rgba(120,76,255,.17),transparent 31%),
            radial-gradient(circle at 45% 84%,rgba(255,61,171,.08),transparent 28%),
            #03050b;
        }

        .ambient{
          position:absolute;
          width:180px;
          height:180px;
          border-radius:50%;
          filter:blur(70px);
          pointer-events:none;
          opacity:.18;
        }

        .a1{left:-90px;top:280px;background:#52f7c8}
        .a2{right:-90px;top:540px;background:#794eff}

        .discoverHero,
        .pulse,
        .discoverSection,
        .coming{
          position:relative;
          z-index:2;
          width:min(100%,760px);
          margin-inline:auto;
        }

        .discoverHero{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
        }

        .discoverHero small,
        .sectionTitle small,
        .coming>small{
          color:#52f7c8;
          font-size:8px;
          font-weight:1000;
          letter-spacing:.16em;
        }

        h1{
          margin:7px 0 0;
          font-size:clamp(39px,12vw,70px);
          line-height:.9;
          letter-spacing:-.07em;
        }

        h1 span{
          color:transparent;
          background:linear-gradient(90deg,#52f7c8,#8a70ff,#ff4eb8);
          -webkit-background-clip:text;
          background-clip:text;
        }

        .discoverHero p{
          margin:12px 0 0;
          color:rgba(255,255,255,.5);
          font-size:12px;
        }

        .searchOrb{
          width:46px;
          height:46px;
          flex:0 0 auto;
          display:grid;
          place-items:center;
          border:1px solid rgba(255,255,255,.1);
          border-radius:16px;
          color:white;
          background:rgba(255,255,255,.055);
          text-decoration:none;
          font-size:27px;
          backdrop-filter:blur(16px);
        }

        .pulse{
          margin-top:25px;
          min-height:46px;
          display:flex;
          align-items:center;
          gap:8px;
          padding:0 12px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.08);
          border-radius:16px;
          background:linear-gradient(90deg,rgba(82,247,200,.07),rgba(118,80,255,.08),rgba(255,68,178,.05));
        }

        .pulse i{
          width:7px;
          height:7px;
          flex:0 0 auto;
          border-radius:50%;
          background:#52f7c8;
          box-shadow:0 0 12px #52f7c8;
          animation:pulse 1.6s infinite;
        }

        .pulse b{
          flex:0 0 auto;
          font-size:8px;
          letter-spacing:.11em;
        }

        .pulse span{
          overflow:hidden;
          white-space:nowrap;
          text-overflow:ellipsis;
          color:rgba(255,255,255,.57);
          font-size:9px;
        }

        .discoverSection{margin-top:31px}

        .sectionTitle{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:12px;
          margin-bottom:12px;
        }

        .sectionTitle small{color:rgba(255,255,255,.37)}

        .sectionTitle h2{
          margin:4px 0 0;
          font-size:21px;
          letter-spacing:-.035em;
        }

        .sectionTitle>span{
          color:rgba(255,255,255,.3);
          font-size:9px;
        }

        .featureRail{
          display:grid;
          grid-auto-flow:column;
          grid-auto-columns:minmax(245px,78vw);
          gap:10px;
          overflow-x:auto;
          scroll-snap-type:x mandatory;
          padding-bottom:4px;
          scrollbar-width:none;
        }

        .featureRail::-webkit-scrollbar{display:none}

        .feature{
          position:relative;
          min-height:225px;
          overflow:hidden;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          scroll-snap-align:start;
          padding:18px;
          border:1px solid rgba(255,255,255,.09);
          border-radius:27px;
          color:white;
          text-decoration:none;
          background:#0a0d15;
          box-shadow:0 22px 48px rgba(0,0,0,.25);
        }

        .feature:active{transform:scale(.97)}

        .feature.pink{
          background:
            radial-gradient(circle at 88% 12%,rgba(255,59,170,.34),transparent 34%),
            linear-gradient(145deg,#171020,#080910);
        }

        .feature.mint{
          background:
            radial-gradient(circle at 88% 12%,rgba(82,247,200,.3),transparent 34%),
            linear-gradient(145deg,#071b19,#070910);
        }

        .feature.purple{
          background:
            radial-gradient(circle at 88% 12%,rgba(115,88,255,.4),transparent 34%),
            linear-gradient(145deg,#111326,#070910);
        }

        .shine{
          position:absolute;
          right:-40px;
          top:-40px;
          width:130px;
          height:130px;
          border-radius:50%;
          background:rgba(255,255,255,.06);
          filter:blur(20px);
        }

        .featureIcon{
          width:47px;
          height:47px;
          display:grid;
          place-items:center;
          border:1px solid rgba(255,255,255,.1);
          border-radius:15px;
          background:rgba(255,255,255,.07);
          font-size:22px;
        }

        .featureText{position:relative;z-index:2}

        .featureText small{
          color:rgba(255,255,255,.42);
          font-size:7px;
          font-weight:1000;
          letter-spacing:.14em;
        }

        .featureText h3{
          margin:4px 0;
          font-size:28px;
          line-height:1;
          letter-spacing:-.05em;
        }

        .featureText p{
          max-width:205px;
          margin:0;
          color:rgba(255,255,255,.55);
          font-size:10px;
          line-height:1.5;
        }

        .open{
          position:absolute;
          right:15px;
          bottom:15px;
          width:33px;
          height:33px;
          display:grid;
          place-items:center;
          border-radius:50%;
          background:rgba(255,255,255,.08);
        }

        .toolGrid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:9px;
        }

        .tool{
          min-height:82px;
          display:grid;
          grid-template-columns:38px minmax(0,1fr) auto;
          align-items:center;
          gap:9px;
          padding:11px;
          border:1px solid rgba(255,255,255,.07);
          border-radius:19px;
          color:white;
          background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.02));
          text-decoration:none;
        }

        .tool>span{
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          border-radius:13px;
          background:linear-gradient(135deg,rgba(82,247,200,.14),rgba(120,82,255,.17));
          font-size:18px;
        }

        .tool b{display:block;font-size:11px}

        .tool small{
          display:block;
          margin-top:3px;
          color:rgba(255,255,255,.39);
          font-size:8px;
        }

        .tool>i{
          color:rgba(255,255,255,.33);
          font-size:20px;
          font-style:normal;
        }

        .coming{
          overflow:hidden;
          margin-top:31px;
          padding:22px;
          border:1px solid rgba(131,94,255,.16);
          border-radius:26px;
          background:linear-gradient(145deg,rgba(28,19,53,.82),rgba(5,8,15,.96));
        }

        .coming h2{
          margin:9px 0 8px;
          max-width:430px;
          font-size:clamp(24px,7vw,34px);
          line-height:1;
          letter-spacing:-.045em;
        }

        .coming h2 span{color:#9e88ff}

        .coming p{
          margin:0;
          max-width:500px;
          color:rgba(255,255,255,.5);
          font-size:10px;
          line-height:1.55;
        }

        .coming div{
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin-top:17px;
        }

        .coming div b{
          padding:7px 9px;
          border:1px solid rgba(255,255,255,.07);
          border-radius:999px;
          background:rgba(255,255,255,.04);
          font-size:7px;
          letter-spacing:.05em;
        }

        @keyframes pulse{
          50%{opacity:.4;transform:scale(.75)}
        }

        @media(min-width:700px){
          .discoverPage{padding-inline:22px}
          .toolGrid{grid-template-columns:repeat(4,minmax(0,1fr))}
        }
      `}</style>
    </main>
  );
}
