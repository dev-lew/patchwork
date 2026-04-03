import { useRef, useState } from "react";

export default function CollectionHero() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const toggleVideo = () => {
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`collection-hero video-container ${isPlaying ? "playing" : "stop_playing"}`}>
      <div className="collection-hero__slider">
        <div className="collection-hero__slide">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            loop
            muted
            preload="auto"
            poster="https://lilluvdog.com/cdn/shop/files/preview_images/c2a0a8cb50594b7ebec8b5c8058cfd74.thumbnail.0000000000_small.jpg?v=1767600372"
          >
            <source
              src="https://lilluvdog.com/cdn/shop/videos/c/vp/c2a0a8cb50594b7ebec8b5c8058cfd74/c2a0a8cb50594b7ebec8b5c8058cfd74.HD-1080p-7.2Mbps-66374547.mp4?v=0"
              type="video/mp4"
            />
          </video>
        </div>
      </div>

      <div className="video-btns hero_vidbtn">
        <button onClick={toggleVideo}>
          {/* Play Icon */}
          <svg id="playIcon" width="14" height="14" viewBox="0 0 14 14">
            <polygon points="2,1 12,7 2,13" fill="#fff" />
          </svg>
          {/* Pause Icon */}
          <svg id="pauseIcon" width="14" height="14" viewBox="0 0 14 14">
            <line x1="3" y1="0" x2="3" y2="14" stroke="#fff" strokeWidth="2" />
            <line x1="9" y1="0" x2="9" y2="14" stroke="#fff" strokeWidth="2" />
          </svg>
        </button>
      </div>

      <div className="collection-banner-content">
        <h1 className="collection-hero__title p-100">
          Clean Beauty <i>for Pets</i>
        </h1>
        <p style={{ color: "#fff"}}>
            For people who care about their dog's beauty routine as much as their own</p>
      </div>
    </div>
  );
}