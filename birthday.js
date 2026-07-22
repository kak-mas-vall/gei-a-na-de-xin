(() => {
  const revealStagger = 1400;
  const panelElements = Array.from(
    document.querySelectorAll("[data-comic-panel]")
  );
  const comic = document.querySelector(".comic-panels");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const videoSupport = document.createElement("video").canPlayType("video/mp4");

  if (!comic || !panelElements.length || prefersReducedMotion || !videoSupport) {
    return;
  }

  document.documentElement.classList.add("comic-motion");

  const states = panelElements.map((panel) => ({
    panel,
    video: panel.querySelector("[data-comic-video]"),
    loopStart: 0,
    hasStarted: false,
    revealComplete: false,
  }));

  let isComicVisible = false;
  let isLooping = false;
  let sequenceStarted = false;
  let nextPanelIndex = 0;
  let revealTimer = null;
  let revealDueAt = 0;
  let remainingRevealDelay = 0;

  const playState = (state) => {
    if (
      !isComicVisible ||
      !state.video ||
      state.panel.classList.contains("is-fallback")
    ) {
      return;
    }

    const playback = state.video.play();
    if (playback) playback.catch(() => showFallback(state));
  };

  const startLoops = () => {
    if (isLooping) return;
    isLooping = true;

    states.forEach((state) => {
      if (!state.video || state.panel.classList.contains("is-fallback")) return;
      state.video.currentTime = state.loopStart;
      playState(state);
    });
  };

  const checkRevealCompletion = () => {
    if (states.every((state) => state.revealComplete)) startLoops();
  };

  const completeReveal = (state) => {
    if (state.revealComplete) return;
    state.revealComplete = true;
    state.panel.classList.remove("is-revealing");
    state.panel.classList.add("is-revealed");
    checkRevealCompletion();
  };

  function showFallback(state) {
    state.panel.classList.add("is-fallback", "is-revealed");
    completeReveal(state);
  }

  states.forEach((state) => {
    const { video } = state;

    if (!video) {
      showFallback(state);
      return;
    }

    state.loopStart = Number(video.dataset.loopStart) || 0;
    video.addEventListener("error", () => showFallback(state), { once: true });

    const setPlaybackRate = () => {
      const syncDuration = Number(video.dataset.syncDuration);
      if (syncDuration) video.playbackRate = video.duration / syncDuration;
    };

    if (video.readyState >= 1) {
      setPlaybackRate();
    } else {
      video.addEventListener("loadedmetadata", setPlaybackRate, { once: true });
    }

    video.addEventListener("ended", () => {
      if (!state.revealComplete) {
        completeReveal(state);
        return;
      }

      if (isLooping) {
        video.currentTime = state.loopStart;
        playState(state);
      }
    });
  });

  const startReveal = (state) => {
    if (!state.video || state.hasStarted) return;
    state.hasStarted = true;
    state.panel.classList.add("is-revealing");
    state.video.currentTime = 0;
    playState(state);
  };

  const scheduleNextReveal = (delay) => {
    if (nextPanelIndex >= states.length || revealTimer !== null) return;

    remainingRevealDelay = delay;
    revealDueAt = performance.now() + delay;
    revealTimer = window.setTimeout(() => {
      revealTimer = null;
      if (!isComicVisible) return;

      startReveal(states[nextPanelIndex]);
      nextPanelIndex += 1;
      scheduleNextReveal(revealStagger);
    }, delay);
  };

  const pauseComic = () => {
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer);
      revealTimer = null;
      remainingRevealDelay = Math.max(0, revealDueAt - performance.now());
    }

    states.forEach((state) => state.video?.pause());
  };

  const resumeComic = () => {
    states.forEach((state) => {
      if (state.hasStarted && !state.video?.ended) playState(state);
    });

    if (!sequenceStarted) {
      sequenceStarted = true;
      scheduleNextReveal(0);
    } else if (nextPanelIndex < states.length) {
      scheduleNextReveal(remainingRevealDelay);
    }
  };

  if (!("IntersectionObserver" in window)) {
    isComicVisible = true;
    resumeComic();
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      isComicVisible = entry.isIntersecting;
      if (isComicVisible) {
        resumeComic();
      } else {
        pauseComic();
      }
    },
    { threshold: 0.2 }
  );

  observer.observe(comic);
})();
