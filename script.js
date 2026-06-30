const wheel = document.querySelector("#wheel");
const form = document.querySelector("#spinForm");
const button = document.querySelector("#spinButton");
const centerSpinButton = document.querySelector("#centerSpinButton");
const message = document.querySelector("#spinMessage");
const memberName = document.querySelector("#memberName");
const telegramName = document.querySelector("#telegramName");
const chanceLabel = document.querySelector("#chanceLabel");
const chanceCount = document.querySelector("#chanceCount");
const carousel = document.querySelector(".promo-carousel");
const carouselTrack = document.querySelector(".promo-carousel-track");
const originalSlides = Array.from(document.querySelectorAll(".promo-slide"));
const dots = Array.from(document.querySelectorAll(".promo-carousel-dots button"));
const previousBanner = document.querySelector(".promo-carousel-control.previous");
const nextBanner = document.querySelector(".promo-carousel-control.next");
const videoSlides = Array.from(document.querySelectorAll(".video-slide"));
const videoDots = Array.from(document.querySelectorAll(".video-carousel-dots button"));
const winnersSection = document.querySelector(".winners-section");
const loginButton = document.querySelector("#loginButton");
const winnerList = document.querySelector("#winnerList");
const winnerCount = document.querySelector("#winnerCount");

const wheelSlots = ["retry", 38, 88, 108, 188, 288, 588, 888, 288, 588, 888];
const retrySlot = { prize: "retry", index: 0 };
const grandPrizeIndexes = wheelSlots
  .map((prize, index) => ({ prize, index }))
  .filter(({ prize }) => prize === 888);

let rotation = 0;
let isSpinning = false;
let spinsUsed = 0;
let idleSpinFrame;
let lastIdleSpinTime;
let isPromoComplete = false;
let resultTimer;
let activeBanner = 0;
let activeTrackIndex = 0;
let carouselTimer;
let slides = originalSlides;
let activeVideo = 0;
let isVideoSectionActive = false;
const carouselDelay = 3800;
const winnerDelay = 2400;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mockWinnerPrizes = [288, 588, 888, 288, 588, 888, 588, 288, 888, 588];
const mockWinnerSeeds = [
  "li",
  "win",
  "vip",
  "gold",
  "chen",
  "top",
  "star",
  "king",
  "luck",
  "hao",
  "sun",
  "alex",
  "jack",
  "neo",
  "max",
  "rain",
  "ace",
  "long",
  "ming",
  "jay",
];
let mockWinners = [];

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function pickRetryOutcome() {
  return {
    ...retrySlot,
    isWin: false,
    label: "再试一次",
  };
}

function pickGrandPrizeOutcome() {
  return {
    ...grandPrizeIndexes[Math.floor(Math.random() * grandPrizeIndexes.length)],
    isWin: true,
    label: "888U",
  };
}

function pickSpinOutcome() {
  return spinsUsed + 1 >= 3 ? pickGrandPrizeOutcome() : pickRetryOutcome();
}

function updateChanceMeter() {
  const chancesLeft = Math.max(3 - spinsUsed, 0);

  if (chanceCount) {
    chanceCount.textContent = `剩余 ${chancesLeft} 次`;
  }

  if (!chanceLabel) {
    return;
  }

  if (isPromoComplete) {
    chanceLabel.textContent = "大奖已锁定";
  } else if (chancesLeft === 1) {
    chanceLabel.textContent = "最后一次，冲刺最高奖";
  } else if (chancesLeft === 2) {
    chanceLabel.textContent = "再试一次，大奖接近中";
  } else {
    chanceLabel.textContent = "三次机会，大奖待解锁";
  }
}

function getNextButtonLabel() {
  const chancesLeft = Math.max(3 - spinsUsed, 0);

  if (chancesLeft <= 0) {
    return "大奖已锁定";
  }

  return chancesLeft === 1 ? "最后一转" : "再试一次";
}

function strongText(text) {
  const element = document.createElement("strong");
  element.textContent = text;
  return element;
}

function showMessage(...parts) {
  message.replaceChildren(
    ...parts.map((part) => (part instanceof Node ? part : document.createTextNode(part)))
  );
}

function normalizeTelegramName(value) {
  return value.startsWith("@") ? value : `@${value}`;
}

function applyWheelRotation() {
  wheel.style.transform = `rotate(${rotation}deg)`;
}

function spinFormFromCenter() {
  if (form.requestSubmit) {
    form.requestSubmit();
    return;
  }

  button.click();
}

function startIdleSpin() {
  if (prefersReducedMotion || isSpinning || isPromoComplete || idleSpinFrame) {
    return;
  }

  wheel.classList.add("is-idling");
  lastIdleSpinTime = null;

  const tick = (timestamp) => {
    if (isSpinning || isPromoComplete) {
      idleSpinFrame = null;
      return;
    }

    if (lastIdleSpinTime !== null) {
      rotation += (timestamp - lastIdleSpinTime) * 0.012;
      applyWheelRotation();
    }

    lastIdleSpinTime = timestamp;
    idleSpinFrame = window.requestAnimationFrame(tick);
  };

  idleSpinFrame = window.requestAnimationFrame(tick);
}

function stopIdleSpin() {
  if (idleSpinFrame) {
    window.cancelAnimationFrame(idleSpinFrame);
  }

  idleSpinFrame = null;
  lastIdleSpinTime = null;
  wheel.classList.remove("is-idling");
}

function createMaskedHandle(index) {
  const seed = mockWinnerSeeds[index % mockWinnerSeeds.length];
  const suffix = String((index * 37 + 88) % 1000).padStart(3, "0");
  return `@${seed}***${suffix}`;
}

function createMockWinner(index, timeLabel = `${index + 1}分钟前`) {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    name: createMaskedHandle(index),
    prize: mockWinnerPrizes[index % mockWinnerPrizes.length],
    time: timeLabel,
  };
}

function createWinnerRow(winner, isNew = false) {
  const item = document.createElement("li");
  if (isNew) {
    item.classList.add("is-new");
  }

  const meta = document.createElement("span");
  meta.className = "winner-meta";

  const name = document.createElement("span");
  name.className = "winner-name";
  name.textContent = winner.name;

  const time = document.createElement("span");
  time.className = "winner-time";
  time.textContent = winner.time;

  const prize = document.createElement("strong");
  prize.className = "winner-prize";
  prize.textContent = `${winner.prize}U`;

  meta.append(name, time);
  item.append(meta, prize);

  return item;
}

function renderWinnerFeed(highlightNewest = false) {
  if (!winnerList) {
    return;
  }

  winnerList.replaceChildren(
    ...mockWinners.map((winner, index) => createWinnerRow(winner, highlightNewest && index === 0))
  );

  if (winnerCount) {
    winnerCount.textContent = `${mockWinners.length}+`;
  }
}

function refreshWinnerTimes() {
  mockWinners = mockWinners.map((winner, index) => ({
    ...winner,
    time: index === 0 ? "刚刚领取" : `${Math.min(index + 1, 99)}分钟前`,
  }));
}

function syncWinnerTimeLabels() {
  if (!winnerList) {
    return;
  }

  const timeLabels = Array.from(winnerList.querySelectorAll(".winner-time"));
  timeLabels.forEach((timeLabel, index) => {
    timeLabel.textContent = index === 0 ? "刚刚领取" : `${Math.min(index + 1, 99)}分钟前`;
  });
}

function addLiveWinner() {
  if (!winnerList) {
    return;
  }

  const nextIndex = mockWinners.length + Math.floor(Math.random() * 1000);
  mockWinners.unshift(createMockWinner(nextIndex, "刚刚领取"));
  mockWinners = mockWinners.slice(0, 100);
  refreshWinnerTimes();

  const row = createWinnerRow(mockWinners[0], true);
  winnerList.prepend(row);
  syncWinnerTimeLabels();

  const gap = Number.parseFloat(window.getComputedStyle(winnerList).rowGap) || 0;
  const offset = row.getBoundingClientRect().height + gap;
  winnerList.style.transition = "none";
  winnerList.style.transform = `translateY(-${offset}px)`;
  winnerList.getBoundingClientRect();
  winnerList.style.transition = "transform 520ms ease";
  winnerList.style.transform = "translateY(0)";

  window.setTimeout(() => {
    winnerList.style.transition = "";
    while (winnerList.children.length > 100) {
      winnerList.lastElementChild?.remove();
    }
  }, 560);
}

function startWinnerFeed() {
  if (!winnerList) {
    return;
  }

  mockWinners = Array.from({ length: 100 }, (_, index) => createMockWinner(index));
  renderWinnerFeed();

  if (prefersReducedMotion) {
    return;
  }

  window.setInterval(() => {
    addLiveWinner();
  }, winnerDelay);
}

function launchGoldRain() {
  const totalCoins = 18;

  for (let i = 0; i < totalCoins; i += 1) {
    const coin = document.createElement("span");
    coin.className = "coin-drop";
    coin.style.left = `${8 + Math.random() * 84}%`;
    coin.style.animationDelay = `${Math.random() * 0.75}s`;
    coin.style.animationDuration = `${1.6 + Math.random() * 0.9}s`;
    document.body.appendChild(coin);
    window.setTimeout(() => coin.remove(), 3000);
  }
}

function getRealBannerIndex(index) {
  return ((index % originalSlides.length) + originalSlides.length) % originalSlides.length;
}

function centerActiveSlide(behavior = prefersReducedMotion ? "auto" : "smooth") {
  if (!carouselTrack || !slides.length) {
    return;
  }

  const activeSlide = slides[activeTrackIndex];
  const targetLeft =
    activeSlide.offsetLeft - (carouselTrack.clientWidth - activeSlide.offsetWidth) / 2;

  carouselTrack.scrollTo({
    left: targetLeft,
    behavior,
  });
}

function normalizeInfinitePosition() {
  if (!originalSlides.length || !slides.length) {
    return;
  }

  const firstOriginalIndex = originalSlides.length;
  const lastOriginalIndex = firstOriginalIndex + originalSlides.length - 1;

  if (activeTrackIndex < firstOriginalIndex) {
    activeTrackIndex += originalSlides.length;
    syncCarouselState();
    centerActiveSlide("auto");
  } else if (activeTrackIndex > lastOriginalIndex) {
    activeTrackIndex -= originalSlides.length;
    syncCarouselState();
    centerActiveSlide("auto");
  }
}

function syncCarouselState() {
  activeBanner = getRealBannerIndex(activeTrackIndex - originalSlides.length);

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === activeTrackIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeBanner);
  });
}

function showBanner(index, behavior = prefersReducedMotion ? "auto" : "smooth") {
  if (!carouselTrack || !originalSlides.length) {
    return;
  }

  activeTrackIndex = index;
  syncCarouselState();
  centerActiveSlide(behavior);

  if (behavior === "auto") {
    normalizeInfinitePosition();
  } else {
    window.setTimeout(normalizeInfinitePosition, 520);
  }
}

function queueNextBanner() {
  if (prefersReducedMotion || slides.length < 2) {
    return;
  }

  window.clearInterval(carouselTimer);
  carouselTimer = window.setInterval(() => {
    showBanner(activeTrackIndex + 1);
  }, carouselDelay);
}

function stopCarousel() {
  window.clearInterval(carouselTimer);
}

if (carousel && slides.length) {
  const beforeClones = originalSlides.map((slide) => {
    const clone = slide.cloneNode(true);
    clone.classList.remove("is-active");
    clone.setAttribute("aria-hidden", "true");
    return clone;
  });
  const afterClones = originalSlides.map((slide) => {
    const clone = slide.cloneNode(true);
    clone.classList.remove("is-active");
    clone.setAttribute("aria-hidden", "true");
    return clone;
  });

  carouselTrack.prepend(...beforeClones);
  carouselTrack.append(...afterClones);
  slides = Array.from(carouselTrack.querySelectorAll(".promo-slide"));
  activeTrackIndex = originalSlides.length;
  showBanner(activeTrackIndex, "auto");

  previousBanner?.addEventListener("click", () => {
    showBanner(activeTrackIndex - 1);
    queueNextBanner();
  });

  nextBanner?.addEventListener("click", () => {
    showBanner(activeTrackIndex + 1);
    queueNextBanner();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showBanner(originalSlides.length + index);
      queueNextBanner();
    });
  });

  carousel.addEventListener("mouseenter", stopCarousel);
  carousel.addEventListener("mouseleave", queueNextBanner);
  carousel.addEventListener("focusin", stopCarousel);
  carousel.addEventListener("focusout", queueNextBanner);
  window.addEventListener("resize", () => centerActiveSlide("auto"));
  queueNextBanner();
}

function showVideo(index) {
  if (!videoSlides.length) {
    return;
  }

  activeVideo = ((index % videoSlides.length) + videoSlides.length) % videoSlides.length;
  const previousIndex = (activeVideo - 1 + videoSlides.length) % videoSlides.length;
  const nextIndex = (activeVideo + 1) % videoSlides.length;
  const secondPreviousIndex = (activeVideo - 2 + videoSlides.length) % videoSlides.length;
  const secondNextIndex = (activeVideo + 2) % videoSlides.length;

  videoSlides.forEach((video, videoIndex) => {
    const isActive = videoIndex === activeVideo;
    const isBefore = videoIndex === previousIndex;
    const isAfter = videoIndex === nextIndex;
    const isFarBefore = videoIndex === secondPreviousIndex;
    const isFarAfter = videoIndex === secondNextIndex;
    video.classList.toggle("is-active", isActive);
    video.classList.toggle("is-before", isBefore && !isActive);
    video.classList.toggle("is-after", isAfter && !isActive);
    video.classList.toggle("is-far-before", isFarBefore && !isActive);
    video.classList.toggle("is-far-after", isFarAfter && !isActive);
    video.setAttribute("aria-hidden", String(!isActive));

    if (!isActive) {
      video.pause();
      video.currentTime = 0;
    }
  });

  videoDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeVideo);
  });

  if (isVideoSectionActive) {
    playActiveVideo();
  }
}

function playActiveVideo() {
  const activeSlide = videoSlides[activeVideo];

  if (!activeSlide) {
    return;
  }

  activeSlide.muted = false;
  activeSlide.volume = 1;
  const playAttempt = activeSlide.play();

  if (playAttempt) {
    playAttempt.catch(() => {
      activeSlide.muted = true;
      activeSlide.play().catch(() => {});
    });
  }
}

function pauseVideoCarousel() {
  videoSlides.forEach((video) => {
    video.pause();
  });
}

if (videoSlides.length) {
  showVideo(0);

  videoDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showVideo(index);
    });
  });

  videoSlides.forEach((video) => {
    video.addEventListener("ended", () => {
      if (video.classList.contains("is-active")) {
        showVideo(activeVideo + 1);
      }
    });
  });

  if ("IntersectionObserver" in window && winnersSection) {
    const videoObserver = new IntersectionObserver(
      ([entry]) => {
        isVideoSectionActive = entry.isIntersecting;

        if (isVideoSectionActive) {
          playActiveVideo();
        } else {
          pauseVideoCarousel();
        }
      },
      { threshold: 0.45 }
    );

    videoObserver.observe(winnersSection);
  } else {
    isVideoSectionActive = true;
    playActiveVideo();
  }
}

loginButton?.addEventListener("click", (event) => {
  const loginUrl = loginButton.dataset.loginUrl?.trim();

  if (!loginUrl) {
    return;
  }

  event.preventDefault();
  window.open(loginUrl, "_blank", "noopener,noreferrer");
});

centerSpinButton?.addEventListener("click", spinFormFromCenter);

startWinnerFeed();
updateChanceMeter();
startIdleSpin();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (isSpinning) {
    return;
  }

  const member = memberName.value.trim();
  const telegram = telegramName.value.trim().replace(/\s+/g, "");

  if (!member || !telegram) {
    showMessage("请先填写注册会员账号与 Telegram 用户名。");
    form.reportValidity();
    return;
  }

  if (spinsUsed >= 3) {
    showMessage("本轮 3 次机会已完成，请联系领奖专员核实大奖。");
    return;
  }

  const selected = pickSpinOutcome();
  const segmentAngle = 360 / wheelSlots.length;
  const kickDegrees = 92;
  const currentSelectedAngle = normalizeDegrees(selected.index * segmentAngle + rotation + kickDegrees);
  const deltaToPointer = normalizeDegrees(360 - currentSelectedAngle);

  isSpinning = true;
  stopIdleSpin();
  button.disabled = true;
  if (centerSpinButton) {
    centerSpinButton.disabled = true;
  }
  button.textContent = "旋转中";
  showMessage("会员 ", strongText(member), " 正在匹配专属礼金...");

  rotation += kickDegrees;
  wheel.style.transition = "transform 160ms linear";
  applyWheelRotation();

  window.clearTimeout(resultTimer);
  window.setTimeout(() => {
    wheel.style.transition = "";
    rotation += 360 * 6 + deltaToPointer;
    applyWheelRotation();
  }, 170);

  resultTimer = window.setTimeout(() => {
    spinsUsed += 1;
    isSpinning = false;
    isPromoComplete = selected.isWin;
    updateChanceMeter();

    if (selected.isWin) {
      button.disabled = true;
      if (centerSpinButton) {
        centerSpinButton.disabled = true;
      }
      button.textContent = "大奖已锁定";
      launchGoldRain();
      showMessage(
        "恭喜 ",
        strongText(member),
        " 抽中最高礼金 ",
        strongText("888U"),
        "！请使用 ",
        strongText(normalizeTelegramName(telegram)),
        " 联系领奖专员核实。"
      );
      return;
    }

    button.disabled = false;
    if (centerSpinButton) {
      centerSpinButton.disabled = false;
    }
    button.textContent = getNextButtonLabel();
    showMessage(
      strongText("再试一次"),
      "！还剩 ",
      strongText(`${Math.max(3 - spinsUsed, 0)} 次`),
      " 机会，大奖正在解锁。"
    );
    startIdleSpin();
  }, 4470);
});
