import React, { useEffect, useRef } from 'react';

export default function HoverVideoController({ activeSocket }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const vid = document.createElement('video');
    vid.src = 'https://lilluvdog.com/cdn/shop/videos/c/vp/00de518db60f4e52b03be8a817a2a274/00de518db60f4e52b03be8a817a2a274.HD-720p-4.5Mbps-60583191.mp4?v=0';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.style.width = '100%';
    vid.style.height = '100%';
    vid.style.objectFit = 'cover';
    vid.style.borderRadius = '16px';
    vid.style.position = 'absolute';
    vid.style.top = '0';
    vid.style.left = '0';
    vid.style.pointerEvents = 'none';
    vid.style.display = 'none';

    videoRef.current = vid;

    return () => {
      if (vid.parentNode) {
        vid.parentNode.removeChild(vid);
      }
      vid.removeAttribute('src');
      vid.load();
    };
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (activeSocket) {
      if (vid.parentNode !== activeSocket) {
        activeSocket.appendChild(vid);
      }
      vid.style.display = 'block';
      let playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
        });
      }
    } else {
      vid.pause();
      vid.style.display = 'none';
    }
  }, [activeSocket]);

  return null;
}
