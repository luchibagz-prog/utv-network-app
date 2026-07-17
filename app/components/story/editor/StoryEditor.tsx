
"use client";

type StoryEditorProps = {
  previewUrl: string;
  isVideo: boolean;
  onClose: () => void;
  onText: () => void;
  onSticker: () => void;
  onMusic: () => void;
  onDraw: () => void;
  onNext: () => void;
};

export default function StoryEditor({
  previewUrl,
  isVideo,
  onClose,
  onText,
  onSticker,
  onMusic,
  onDraw,
  onNext,
}: StoryEditorProps) {
  return (
    <main className="storyEditor">
      <style>{styles}</style>

      <section className="storyCanvas">
        {isVideo ? (
          <video
            className="storyMedia"
            src={previewUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            className="storyMedia"
            src={previewUrl}
            alt="Story preview"
          />
        )}

        <div className="storyShade" />
      </section>

      <header className="storyTopBar">
        <button
          type="button"
          className="roundButton closeButton"
          onClick={onClose}
          aria-label="Close story editor"
        >
          ×
        </button>

        <nav className="storyTools" aria-label="Story tools">
          <button
            type="button"
            className="toolButton textTool"
            onClick={onText}
            aria-label="Add text"
          >
            Aa
          </button>

          <button
            type="button"
            className="toolButton"
            onClick={onSticker}
            aria-label="Add sticker"
          >
            😊
          </button>

          <button
            type="button"
            className="toolButton"
            onClick={onMusic}
            aria-label="Add music"
          >
            🎵
          </button>

          <button
            type="button"
            className="toolButton"
            onClick={onDraw}
            aria-label="Draw"
          >
            ✏️
          </button>
        </nav>
      </header>

      <footer className="storyBottomBar">
        <button
          type="button"
          className="storyAudienceButton"
          onClick={onNext}
        >
          <span className="audienceIcon">◉</span>

          <span>
            <strong>Your Story</strong>
            <small>Share with followers</small>
          </span>
        </button>

        <button
          type="button"
          className="nextButton"
          onClick={onNext}
          aria-label="Continue to share"
        >
          →
        </button>
      </footer>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  button {
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .storyEditor {
    position: fixed;
    inset: 0;
    z-index: 1000;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    color: white;
    background: #000;
    touch-action: none;
  }

  .storyCanvas {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
  }

  .storyMedia {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
    user-select: none;
    -webkit-user-drag: none;
  }

  .storyShade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.58) 0%,
        rgba(0, 0, 0, 0.08) 18%,
        transparent 45%,
        rgba(0, 0, 0, 0.1) 68%,
        rgba(0, 0, 0, 0.72) 100%
      );
  }

  .storyTopBar {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding:
      max(14px, env(safe-area-inset-top))
      16px
      12px;
  }

  .roundButton,
  .toolButton {
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: white;
    border: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.38);
    box-shadow: 0 5px 18px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(12px);
  }

  .closeButton {
    font-size: 32px;
    font-weight: 300;
    line-height: 1;
  }

  .storyTools {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolButton {
    font-size: 21px;
    font-weight: 850;
  }

  .textTool {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 19px;
    letter-spacing: -1px;
  }

  .roundButton:active,
  .toolButton:active,
  .nextButton:active,
  .storyAudienceButton:active {
    transform: scale(0.94);
  }

  .storyBottomBar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding:
      14px
      16px
      max(20px, env(safe-area-inset-bottom));
  }

  .storyAudienceButton {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 15px;
    color: white;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.42);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(15px);
  }

  .audienceIcon {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: #07100c;
    border-radius: 50%;
    background: #52f7c8;
    font-size: 20px;
    font-weight: 950;
  }

  .storyAudienceButton strong,
  .storyAudienceButton small {
    display: block;
  }

  .storyAudienceButton strong {
    font-size: 14px;
    font-weight: 900;
  }

  .storyAudienceButton small {
    margin-top: 2px;
    color: rgba(255, 255, 255, 0.62);
    font-size: 11px;
  }

  .nextButton {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: #06100d;
    border: 0;
    border-radius: 50%;
    background: #52f7c8;
    box-shadow:
      0 8px 25px rgba(0, 0, 0, 0.3),
      0 0 26px rgba(82, 247, 200, 0.22);
    font-size: 30px;
    font-weight: 900;
  }

  @media (min-width: 720px) {
    .storyEditor {
      right: auto;
      left: 50%;
      width: min(430px, 100%);
      transform: translateX(-50%);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      border-left: 1px solid rgba(255, 255, 255, 0.12);
    }
  }
`;
