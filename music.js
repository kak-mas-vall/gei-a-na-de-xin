(() => {
  const audio = document.getElementById("background-music");
  const toggle = document.getElementById("music-toggle");

  if (!audio || !toggle) return;

  const targetVolume = 0.18;
  let fadeFrame = null;
  let userWantsMusic = false;

  audio.volume = 0;
  toggle.hidden = false;

  const updateButton = () => {
    const label = userWantsMusic ? "Jeda musik latar" : "Putar musik latar";
    toggle.classList.toggle("is-playing", userWantsMusic);
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("aria-pressed", String(userWantsMusic));
    toggle.title = label;
  };

  const fadeTo = (volume, duration, onComplete) => {
    if (fadeFrame !== null) window.cancelAnimationFrame(fadeFrame);

    const initialVolume = audio.volume;
    const startedAt = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      audio.volume = initialVolume + (volume - initialVolume) * progress;

      if (progress < 1) {
        fadeFrame = window.requestAnimationFrame(step);
        return;
      }

      fadeFrame = null;
      if (onComplete) onComplete();
    };

    fadeFrame = window.requestAnimationFrame(step);
  };

  const playMusic = async () => {
    userWantsMusic = true;
    updateButton();

    try {
      await audio.play();
      fadeTo(targetVolume, 1600);
    } catch {
      userWantsMusic = false;
      updateButton();
    }
  };

  const pauseMusic = () => {
    userWantsMusic = false;
    updateButton();
    fadeTo(0, 500, () => {
      if (!userWantsMusic) audio.pause();
    });
  };

  toggle.addEventListener("click", () => {
    if (userWantsMusic) {
      pauseMusic();
    } else {
      playMusic();
    }
  });

  audio.addEventListener(
    "error",
    () => {
      toggle.hidden = true;
    },
    { once: true }
  );

  updateButton();
})();
