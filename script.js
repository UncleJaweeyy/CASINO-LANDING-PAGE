import { loadPublicSettings, loadPublicVideos, redeemEligibility } from "./firebase-client.js";

const managedVideos = await loadPublicVideos().catch(() => null);
if (managedVideos !== null) {
  const escapeAttribute = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
  const videoViewport = document.querySelector(".video-carousel-viewport");
  const videoDotList = document.querySelector(".video-carousel-dots");
  if (!managedVideos.length) document.querySelector(".video-carousel").hidden = true;
  videoViewport.innerHTML = managedVideos.map((video, index) => `<video
    class="video-slide${index === 0 ? " is-active" : ""}"
    src="${escapeAttribute(video.url)}"
    aria-label="${escapeAttribute(video.title || `Winning video ${index + 1}`)}"
    playsinline preload="metadata"></video>`).join("");
  videoDotList.innerHTML = managedVideos.map((video, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" aria-label="Show ${escapeAttribute(video.title || `video ${index + 1}`)}"></button>`).join("");
}

const wheel = document.querySelector("#wheel");
const form = document.querySelector("#spinForm");
const button = document.querySelector("#spinButton");
const centerSpinButton = document.querySelector("#centerSpinButton");
const message = document.querySelector("#spinMessage");
const memberName = document.querySelector("#memberName");
const redemptionCode = document.querySelector("#redemptionCode");
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
const specialistButton = document.querySelector("#specialistButton");
const contactSection = document.querySelector("#contact");
const languageSelect = document.querySelector("#languageSelect");
const winnerList = document.querySelector("#winnerList");
const winnerCount = document.querySelector("#winnerCount");
const winModal = document.querySelector("#winModal");
const winAmountText = document.querySelector("#winAmountText");
const modalTelegramButton = document.querySelector("#modalTelegramButton");
const modalWhatsappButton = document.querySelector("#modalWhatsappButton");
const contactTelegramButton = document.querySelector("#contactTelegramButton");
const contactWhatsappButton = document.querySelector("#contactWhatsappButton");

const wheelSlots = [38, 18, 88, 108, 188, 288, 588, 888, 288, 588, 888];

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
let videoSwipeStartX = 0;
let videoSwipeStartY = 0;
let isVideoSwiping = false;
const carouselDelay = 3800;
const winnerDelay = 2400;
let specialistTelegram = "kaiye9998";
let specialistTelegramUrl = `https://t.me/${specialistTelegram}`;
let specialistWhatsapp = "";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mockWinnerPrizes = [38, 88, 108, 188, 88, 108, 38, 188, 108, 88];
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
let currentLanguage = "zh";

const translations = {
  en: {
    pageTitle: "1XROLL Welcome Gift | 888U Spin Bonus",
    navHome: "Home",
    navSpecialist: "Prize Specialist: 1XROLL Plan",
    navLogin: "Login",
    heroEyebrow: "1XROLL WELCOME BONUS",
    heroTitle: "1XROLL Welcome Gift, 888U Spin Bonus Awaits",
    heroCopy:
      "New members unlock an exclusive prize wheel. Enter your details and start with live casino, slots, sports, and cards in one place.",
    heroPrimary: "Spin Now",
    heroSecondary: "Subscribe to Telegram for 68U",
    campaign1Title: "New Member Welcome Bonus",
    campaign1Offer: "68 USD",
    campaign1Cta: "Register Now & Claim",
    campaign2Title: "Newcomer Lucky Draw Rewards",
    campaign2Offer: "Up to 888",
    campaign2Cta: "Spin Now",
    campaign3Title: "Daily Deposit Rewards",
    campaign3Offer: "Claim up to 988 at will!",
    campaign3Cta: "Claim Now",
    campaign4Title: "First Deposit Bonus",
    campaign4Offer: "Up to 2288",
    campaign4Cta: "Claim Now",
    campaign5Title: "Monthly Turnover Reward",
    campaign5Offer: "Includes a Rolex Watch",
    campaign5Cta: "Join Now",
    heroStatPrize: "Grand Bonus",
    heroStatNoLow: "Skip Low Rewards",
    heroStatService: "Specialist Service",
    spinTitle: "1XROLL Bonus Wheel",
    spinSubtitle: "One redemption code unlocks one guaranteed, admin-assigned prize.",
    newMember: "NEW MEMBER",
    formTitle: "Claim Eligibility",
    chanceLocked: "Reward locked.",
    chanceCount: "{count} left",
    memberLabel: "Registered Member Account",
    memberPlaceholder: "Enter your registered member account",
    redemptionCodeLabel: "Redemption Code",
    redemptionCodePlaceholder: "Enter your redemption code",
    telegramLabel: "Telegram Username",
    telegramPlaceholder: "@telegram",
    spinButton: "Spin the Wheel",
    spinning: "Spinning",
    prizeLockedButton: "Reward Locked",
    spinInitialMessage: "Enter your member account and redemption code to reveal your assigned prize.",
    missingFields: "Please enter your member account and redemption code first.",
    completedMessage: "This redemption code has already awarded its prize. Please contact a prize specialist for verification.",
    matchingPrefix: "Member ",
    matchingSuffix: " is matching a special bonus...",
    winPrefix: "Congratulations ",
    winMiddle: " won the top bonus ",
    winSuffix: "! Please use ",
    winContact: " to contact a prize specialist for verification.",
    videoTitle: "Winning Videos",
    videoSubtitle:
      "Fresh bonus highlights keep rolling. Watch how others take home 888U and claim the next spotlight.",
    latestClaim: "Latest Award Claim",
    liveBadge: "LIVE",
    introTitle: "Premium Venues, VIP Experience",
    introSubtitle:
      "Explore live casino, slots, sports, card games, and premium VIP service in a smooth, stable, trusted entertainment platform.",
    gameLiveTitle: "Live Casino",
    gameLiveDesc: "Baccarat, dragon tiger, and roulette with crisp live interaction.",
    gameSlotsTitle: "Slots",
    gameSlotsDesc: "Popular slots and themed jackpots are ready whenever you are.",
    gameSportsTitle: "Sports",
    gameSportsDesc: "Global top leagues with rich markets and steady lines.",
    gameCardsTitle: "Cards & Tables",
    gameCardsDesc: "Classic games and fast tables for every playing rhythm.",
    contactTitle: "Contact Prize Specialist",
    contactSubtitle:
      "After submitting your winning details, a specialist will help verify and distribute rewards through Telegram or WhatsApp.",
    telegramSpecialist: "Telegram Specialist",
    whatsappSpecialist: "WhatsApp Specialist",
    winModalBadge: "GRAND PRIZE",
    winModalTitle: "Congratulations!",
    winModalCopyPrefix: "You won",
    winModalCopySuffix: "from the 1XROLL bonus wheel.",
    winModalSubcopy:
      "Contact a prize specialist now. Your claim details will be attached automatically.",
    claimMessage:
      "Hello 1XROLL Prize Specialist, I would like to claim my spin bonus. Member account: {member}. Redemption code: {redemptionCode}. Telegram: {telegram}. Prize amount: {amount}. Timestamp: {timestamp}. Please help verify and process my reward. Thank you.",
    justClaimed: "Just claimed",
    minutesAgo: "{count} min ago",
  },
  zh: {
    pageTitle: "1XROLL 新手豪礼 | 转盘礼金 888U",
    navHome: "主页",
    navSpecialist: "领奖专员：1XROLL企划",
    navLogin: "注册",
    heroEyebrow: "1XROLL 新手礼遇",
    heroTitle: "1XROLL新手豪礼，转盘礼金888U，豪礼相迎",
    heroCopy: "注册即享专属转盘，输入会员信息后开启豪华礼金。真人、电子、体育、棋牌一站式开局。",
    heroPrimary: "立即抽奖",
    heroSecondary: "订阅飞机频道领68U",
    campaign1Title: "新会员欢迎奖金",
    campaign1Offer: "68 USD",
    campaign1Cta: "立即注册并领取",
    campaign2Title: "新人转盘奖励",
    campaign2Offer: "最高领取 888",
    campaign2Cta: "立即抽奖",
    campaign3Title: "日存豪礼天天送",
    campaign3Offer: "最高 988 随意领",
    campaign3Cta: "立即领取",
    campaign4Title: "首存豪礼",
    campaign4Offer: "最高 2288",
    campaign4Cta: "立即领取",
    campaign5Title: "月度流水嘉奖",
    campaign5Offer: "赠送劳力士",
    campaign5Cta: "立即参与",
    heroStatPrize: "最高礼金",
    heroStatNoLow: "避开低奖",
    heroStatService: "专员服务",
    spinTitle: "1XROLL 豪礼转盘",
    spinSubtitle: "每个兑换码可抽奖一次，并获得管理员预设的奖品。",
    newMember: "新会员",
    formTitle: "领取资格登记",
    chanceLocked: "奖励已锁定",
    chanceCount: "剩余 {count} 次",
    memberLabel: "注册会员账号",
    memberPlaceholder: "请输入已注册会员账号",
    redemptionCodeLabel: "兑换码",
    redemptionCodePlaceholder: "请输入兑换码",
    telegramLabel: "Telegram 用户名",
    telegramPlaceholder: "@telegram",
    spinButton: "旋转转盘",
    spinning: "旋转中",
    prizeLockedButton: "奖励已锁定",
    spinInitialMessage: "填写会员账号和兑换码，立即获得预设奖品。",
    missingFields: "请先填写会员账号和兑换码。",
    completedMessage: "此兑换码已成功获得奖品，请联系领奖专员核实奖励。",
    matchingPrefix: "会员 ",
    matchingSuffix: " 正在匹配专属礼金...",
    winPrefix: "恭喜 ",
    winMiddle: " 抽中最高礼金 ",
    winSuffix: "！请使用 ",
    winContact: " 联系领奖专员核实。",
    videoTitle: "中奖视频",
    videoSubtitle: "真实礼金高光持续更新，看看别人如何把 888U 带走，下一个高光席位等你来占。",
    latestClaim: "最新领奖",
    liveBadge: "实时",
    introTitle: "实力场馆，尊贵体验",
    introSubtitle:
      "汇聚真人视讯、电子游艺、体育赛事、棋牌竞技与高端 VIP 服务，为玩家打造稳定、流畅、值得信赖的娱乐平台。",
    gameLiveTitle: "真人视讯",
    gameLiveDesc: "百家乐、龙虎、轮盘，高清互动开局。",
    gameSlotsTitle: "电子游艺",
    gameSlotsDesc: "热门老虎机与主题大奖池随时开启。",
    gameSportsTitle: "体育赛事",
    gameSportsDesc: "覆盖全球热门联赛，盘口丰富稳定。",
    gameCardsTitle: "棋牌竞技",
    gameCardsDesc: "经典玩法与快速桌台满足不同节奏。",
    contactTitle: "联系领奖专员",
    contactSubtitle: "提交中奖信息后，专员将通过 Telegram 或 WhatsApp 协助核实与派发。",
    telegramSpecialist: "Telegram 专员",
    whatsappSpecialist: "WhatsApp 专员",
    winModalBadge: "最高大奖",
    winModalTitle: "恭喜中奖！",
    winModalCopyPrefix: "您已赢得",
    winModalCopySuffix: "1XROLL 豪礼转盘奖励。",
    winModalSubcopy: "立即联系领奖专员，系统会自动附上您的领奖资料。",
    claimMessage:
      "您好 1XROLL 领奖专员，我想领取我的转盘礼金。会员账号：{member}。兑换码：{redemptionCode}。Telegram：{telegram}。中奖金额：{amount}。时间：{timestamp}。请协助核实并处理奖励，谢谢。",
    justClaimed: "刚刚领取",
    minutesAgo: "{count}分钟前",
  },
  vi: {
    pageTitle: "1XROLL Quà Tân Thủ | Vòng Quay 888U",
    navHome: "Trang chủ",
    navSpecialist: "Chuyên viên nhận thưởng: 1XROLL",
    navLogin: "Đăng nhập",
    heroEyebrow: "ƯU ĐÃI CHÀO MỪNG 1XROLL",
    heroTitle: "Quà tân thủ 1XROLL, vòng quay thưởng 888U đang chờ",
    heroCopy:
      "Thành viên mới mở khóa vòng quay độc quyền. Nhập thông tin để bắt đầu với casino live, slot, thể thao và bài bàn.",
    heroPrimary: "Quay ngay",
    heroSecondary: "Theo dõi Telegram nhận 68U",
    campaign1Title: "Ưu đãi chào mừng thành viên mới",
    campaign1Offer: "68 USD",
    campaign1Cta: "Đăng ký và nhận thưởng",
    campaign2Title: "Rút thăm may mắn cho người chơi mới",
    campaign2Offer: "Lên đến 888",
    campaign2Cta: "Quay ngay",
    campaign3Title: "Thưởng nạp tiền hàng ngày",
    campaign3Offer: "Nhận tùy thích lên đến 988!",
    campaign3Cta: "Nhận ngay",
    campaign4Title: "Thưởng nạp tiền lần đầu",
    campaign4Offer: "Lên đến 2288",
    campaign4Cta: "Nhận ngay",
    campaign5Title: "Thưởng doanh thu hàng tháng",
    campaign5Offer: "Bao gồm đồng hồ Rolex",
    campaign5Cta: "Tham gia ngay",
    heroStatPrize: "Thưởng cao nhất",
    heroStatNoLow: "Bỏ qua thưởng thấp",
    heroStatService: "Hỗ trợ 24H",
    spinTitle: "Vòng Quay Thưởng 1XROLL",
    spinSubtitle: "Mỗi mã đổi thưởng mở một lượt quay với giải thưởng do quản trị viên chỉ định.",
    newMember: "THÀNH VIÊN MỚI",
    formTitle: "Đăng ký nhận thưởng",
    chanceLocked: "Phần thưởng đã khóa.",
    chanceCount: "Còn {count} lượt",
    memberLabel: "Tài khoản thành viên đã đăng ký",
    memberPlaceholder: "Nhập tài khoản thành viên đã đăng ký",
    redemptionCodeLabel: "Mã nhận thưởng",
    redemptionCodePlaceholder: "Nhập mã nhận thưởng",
    telegramLabel: "Tên Telegram",
    telegramPlaceholder: "@telegram",
    spinButton: "Quay thưởng",
    spinning: "Đang quay",
    prizeLockedButton: "Đã khóa thưởng",
    spinInitialMessage: "Nhập tài khoản thành viên và mã đổi thưởng để nhận giải đã chỉ định.",
    missingFields: "Vui lòng nhập tài khoản thành viên và mã đổi thưởng.",
    completedMessage: "Mã đổi thưởng này đã nhận giải. Hãy liên hệ chuyên viên để xác minh.",
    matchingPrefix: "Thành viên ",
    matchingSuffix: " đang ghép thưởng đặc biệt...",
    winPrefix: "Chúc mừng ",
    winMiddle: " đã trúng thưởng cao nhất ",
    winSuffix: "! Vui lòng dùng ",
    winContact: " để liên hệ chuyên viên xác minh.",
    videoTitle: "Video trúng thưởng",
    videoSubtitle: "Khoảnh khắc nhận thưởng được cập nhật liên tục. Xem người khác mang 888U về và chiếm spotlight tiếp theo.",
    latestClaim: "Nhận thưởng mới nhất",
    liveBadge: "TRỰC TIẾP",
    introTitle: "Sảnh cao cấp, trải nghiệm VIP",
    introSubtitle:
      "Khám phá live casino, slot, thể thao, bài bàn và dịch vụ VIP trong một nền tảng giải trí ổn định, mượt mà, đáng tin cậy.",
    gameLiveTitle: "Live Casino",
    gameLiveDesc: "Baccarat, rồng hổ và roulette với tương tác trực tiếp sắc nét.",
    gameSlotsTitle: "Slot",
    gameSlotsDesc: "Slot nổi bật và jackpot theo chủ đề luôn sẵn sàng.",
    gameSportsTitle: "Thể thao",
    gameSportsDesc: "Các giải đấu hàng đầu toàn cầu với kèo đa dạng và ổn định.",
    gameCardsTitle: "Bài & Bàn",
    gameCardsDesc: "Trò chơi kinh điển và bàn nhanh cho mọi nhịp chơi.",
    contactTitle: "Liên hệ chuyên viên nhận thưởng",
    contactSubtitle:
      "Sau khi gửi thông tin trúng thưởng, chuyên viên sẽ hỗ trợ xác minh và phát thưởng qua Telegram hoặc WhatsApp.",
    telegramSpecialist: "Chuyên viên Telegram",
    whatsappSpecialist: "Chuyên viên WhatsApp",
    winModalBadge: "GIẢI LỚN",
    winModalTitle: "Chúc mừng!",
    winModalCopyPrefix: "Bạn đã thắng",
    winModalCopySuffix: "từ vòng quay thưởng 1XROLL.",
    winModalSubcopy:
      "Liên hệ chuyên viên nhận thưởng ngay. Thông tin nhận thưởng sẽ được đính kèm tự động.",
    claimMessage:
      "Xin chào Chuyên viên nhận thưởng 1XROLL, tôi muốn nhận bonus vòng quay. Tài khoản thành viên: {member}. Mã nhận thưởng: {redemptionCode}. Telegram: {telegram}. Số tiền thưởng: {amount}. Thời gian: {timestamp}. Vui lòng hỗ trợ xác minh và xử lý phần thưởng. Cảm ơn.",
    justClaimed: "Vừa nhận",
    minutesAgo: "{count} phút trước",
  },
  ms: {
    pageTitle: "1XROLL Hadiah Ahli Baru | Bonus Putaran 888U",
    navHome: "Laman Utama",
    navSpecialist: "Pakar Hadiah: 1XROLL",
    navLogin: "Log Masuk",
    heroEyebrow: "BONUS SELAMAT DATANG 1XROLL",
    heroTitle: "Hadiah Ahli Baru 1XROLL, Bonus Putaran 888U Menanti",
    heroCopy:
      "Ahli baru membuka roda hadiah eksklusif. Masukkan maklumat anda dan mula bermain live casino, slot, sukan, serta permainan kad di satu tempat.",
    heroPrimary: "Putar Sekarang",
    heroSecondary: "Langgan Telegram dapat 68U",
    campaign1Title: "Bonus Selamat Datang Ahli Baru",
    campaign1Offer: "68 USD",
    campaign1Cta: "Daftar dan Tuntut",
    campaign2Title: "Ganjaran Cabutan Bertuah Ahli Baru",
    campaign2Offer: "Sehingga 888",
    campaign2Cta: "Putar Sekarang",
    campaign3Title: "Ganjaran Deposit Harian",
    campaign3Offer: "Tuntut sehingga 988!",
    campaign3Cta: "Tuntut Sekarang",
    campaign4Title: "Bonus Deposit Pertama",
    campaign4Offer: "Sehingga 2288",
    campaign4Cta: "Tuntut Sekarang",
    campaign5Title: "Ganjaran Pusing Ganti Bulanan",
    campaign5Offer: "Termasuk Jam Tangan Rolex",
    campaign5Cta: "Sertai Sekarang",
    heroStatPrize: "Bonus Tertinggi",
    heroStatNoLow: "Elak Hadiah Rendah",
    heroStatService: "Servis Pakar 24J",
    spinTitle: "Roda Bonus 1XROLL",
    spinSubtitle: "Setiap kod penebusan membuka satu putaran dengan hadiah yang ditetapkan pentadbir.",
    newMember: "AHLI BARU",
    formTitle: "Kelayakan Tuntutan",
    chanceLocked: "Hadiah dikunci.",
    chanceCount: "Baki {count} kali",
    memberLabel: "Akaun Ahli Berdaftar",
    memberPlaceholder: "Masukkan akaun ahli berdaftar",
    redemptionCodeLabel: "Kod Penebusan",
    redemptionCodePlaceholder: "Masukkan kod penebusan",
    telegramLabel: "Nama Pengguna Telegram",
    telegramPlaceholder: "@telegram",
    spinButton: "Putar Roda",
    spinning: "Sedang Berputar",
    prizeLockedButton: "Hadiah Dikunci",
    spinInitialMessage: "Masukkan akaun ahli dan kod penebusan untuk menerima hadiah yang ditetapkan.",
    missingFields: "Sila masukkan akaun ahli dan kod penebusan.",
    completedMessage: "Kod penebusan ini telah menerima hadiah. Sila hubungi pakar untuk pengesahan.",
    matchingPrefix: "Ahli ",
    matchingSuffix: " sedang dipadankan dengan bonus istimewa...",
    winPrefix: "Tahniah ",
    winMiddle: " memenangi bonus tertinggi ",
    winSuffix: "! Sila gunakan ",
    winContact: " untuk menghubungi pakar hadiah bagi pengesahan.",
    videoTitle: "Video Kemenangan",
    videoSubtitle:
      "Sorotan bonus terkini sentiasa dikemas kini. Lihat cara pemain lain membawa pulang 888U dan rebut giliran sorotan seterusnya.",
    latestClaim: "Tuntutan Hadiah Terkini",
    liveBadge: "LANGSUNG",
    introTitle: "Arena Premium, Pengalaman VIP",
    introSubtitle:
      "Terokai live casino, slot, sukan, permainan kad dan servis VIP premium dalam platform hiburan yang lancar, stabil dan dipercayai.",
    gameLiveTitle: "Live Casino",
    gameLiveDesc: "Baccarat, dragon tiger dan roulette dengan interaksi langsung yang jelas.",
    gameSlotsTitle: "Slot",
    gameSlotsDesc: "Slot popular dan jackpot bertema tersedia bila-bila masa.",
    gameSportsTitle: "Sukan",
    gameSportsDesc: "Liga utama global dengan pasaran lengkap dan odds stabil.",
    gameCardsTitle: "Kad & Meja",
    gameCardsDesc: "Permainan klasik dan meja pantas untuk setiap rentak permainan.",
    contactTitle: "Hubungi Pakar Hadiah",
    contactSubtitle:
      "Selepas menghantar maklumat kemenangan, pakar akan membantu mengesahkan dan mengagihkan hadiah melalui Telegram atau WhatsApp.",
    telegramSpecialist: "Pakar Telegram",
    whatsappSpecialist: "Pakar WhatsApp",
    winModalBadge: "HADIAH UTAMA",
    winModalTitle: "Tahniah!",
    winModalCopyPrefix: "Anda memenangi",
    winModalCopySuffix: "daripada roda bonus 1XROLL.",
    winModalSubcopy:
      "Hubungi pakar hadiah sekarang. Butiran tuntutan anda akan dilampirkan secara automatik.",
    claimMessage:
      "Hello Pakar Hadiah 1XROLL, saya ingin menuntut bonus putaran saya. Akaun ahli: {member}. Kod penebusan: {redemptionCode}. Telegram: {telegram}. Jumlah hadiah: {amount}. Masa: {timestamp}. Sila bantu sahkan dan proses hadiah saya. Terima kasih.",
    justClaimed: "Baru dituntut",
    minutesAgo: "{count} min lalu",
  },
};

const bannerLanguageFolders = {
  en: "",
  zh: "zh/",
  vi: "vi/",
  ms: "ms/",
};

function t(key, replacements = {}) {
  const template = translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    template
  );
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "zh";
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : currentLanguage;
  document.title = t("pageTitle");

  const bannerFolder = bannerLanguageFolders[currentLanguage];
  document.querySelectorAll("img[data-localized-banner]").forEach((slide) => {
    const bannerNumber = String(slide.dataset.localizedBanner).padStart(2, "0");
    slide.src = `assets/HERO_BANNERS_CAROUSELS/${bannerFolder}banner${bannerNumber}.png`;
    slide.alt = `${currentLanguage.toUpperCase()} promotional banner ${bannerNumber}`;
  });

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });

  updateChanceMeter();
  if (!isSpinning && !isPromoComplete) {
    button.textContent = spinsUsed === 0 ? t("spinButton") : getNextButtonLabel();
  } else if (isPromoComplete) {
    button.textContent = t("prizeLockedButton");
  }

  if (mockWinners.length) {
    refreshWinnerTimes();
    renderWinnerFeed();
  }

  const storedClaim = window.localStorage.getItem("winboxLatestClaim");
  if (storedClaim) {
    try {
      updateClaimLinks(JSON.parse(storedClaim));
    } catch {
      window.localStorage.removeItem("winboxLatestClaim");
    }
  }
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function outcomeForPrize(prizeLabel) {
  const prize = Number.parseInt(prizeLabel, 10);
  const matchingIndexes = wheelSlots
    .map((slotPrize, index) => ({ prize: slotPrize, index }))
    .filter((slot) => slot.prize === prize);
  return matchingIndexes[Math.floor(Math.random() * matchingIndexes.length)] || { prize: 38, index: 0 };
}

function updateChanceMeter() {
  if (chanceCount) {
    chanceCount.textContent = isPromoComplete ? t("prizeLockedButton") : (currentLanguage === "zh" ? "1 次抽奖" : "1 spin");
  }

  if (!chanceLabel) {
    return;
  }

  if (isPromoComplete) {
    chanceLabel.textContent = t("chanceLocked");
  } else {
    chanceLabel.textContent = currentLanguage === "zh" ? "输入账号和兑换码，立即获得奖品" : "Enter your account and code to reveal your prize.";
  }
}

function getNextButtonLabel() {
  return isPromoComplete ? t("prizeLockedButton") : t("spinButton");
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
  if (!value || value === "—") return "—";
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

function getWinnerTimeLabel(index) {
  return index === 0 ? t("justClaimed") : t("minutesAgo", { count: Math.min(index + 1, 99) });
}

function createMockWinner(index, timeLabel = getWinnerTimeLabel(index)) {
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
    time: getWinnerTimeLabel(index),
  }));
}

function syncWinnerTimeLabels() {
  if (!winnerList) {
    return;
  }

  const timeLabels = Array.from(winnerList.querySelectorAll(".winner-time"));
  timeLabels.forEach((timeLabel, index) => {
    timeLabel.textContent = getWinnerTimeLabel(index);
  });
}

function addLiveWinner() {
  if (!winnerList) {
    return;
  }

  const nextIndex = mockWinners.length + Math.floor(Math.random() * 1000);
  mockWinners.unshift(createMockWinner(nextIndex, t("justClaimed")));
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

function launchConfetti() {
  if (prefersReducedMotion) {
    return;
  }

  const colors = ["#baff00", "#ffee5b", "#ffffff", "#66ff9d", "#37f46c"];

  for (let i = 0; i < 72; i += 1) {
    const confetti = document.createElement("span");
    confetti.className = "confetti-piece";
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.setProperty("--confetti-color", colors[i % colors.length]);
    confetti.style.animationDelay = `${Math.random() * 0.8}s`;
    confetti.style.animationDuration = `${2.4 + Math.random() * 1.8}s`;
    confetti.style.transform = `rotate(${Math.random() * 180}deg)`;
    document.body.appendChild(confetti);
    window.setTimeout(() => confetti.remove(), 4700);
  }
}

function createClaimDetails(amount, member, redemptionCodeValue, telegram) {
  const timestamp = new Date().toISOString();

  return {
    member,
    redemptionCode: redemptionCodeValue,
    telegram: normalizeTelegramName(telegram),
    amount,
    timestamp,
  };
}

function buildClaimMessage(claim) {
  return t("claimMessage", claim);
}

function storeClaimDetails(claim) {
  window.localStorage.setItem("winboxLatestClaim", JSON.stringify(claim));
}

function updateClaimLinks(claim) {
  const messageText = encodeURIComponent(buildClaimMessage(claim));

  if (modalTelegramButton) {
    modalTelegramButton.href = `https://t.me/${specialistTelegram}?text=${messageText}`;
  }

  if (modalWhatsappButton) {
    modalWhatsappButton.href = specialistWhatsapp
      ? `https://wa.me/${specialistWhatsapp}?text=${messageText}`
      : "";
  }
}

function openWinModal(claim) {
  if (!winModal) {
    return;
  }

  if (winAmountText) {
    winAmountText.textContent = claim.amount;
  }

  updateClaimLinks(claim);
  winModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeWinModal() {
  if (!winModal) {
    return;
  }

  winModal.hidden = true;
  document.body.classList.remove("modal-open");
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

async function initializeContactSettings() {
  try {
    const settings = await loadPublicSettings();
    specialistTelegram = settings.telegram || "kaiye9998";
    specialistWhatsapp = settings.whatsapp || "";
    specialistTelegramUrl = `https://t.me/${specialistTelegram}`;
    if (contactTelegramButton) contactTelegramButton.href = specialistTelegramUrl;
    if (contactWhatsappButton) {
      contactWhatsappButton.href = specialistWhatsapp ? `https://wa.me/${specialistWhatsapp}` : "";
      contactWhatsappButton.hidden = !specialistWhatsapp;
    }
  } catch (error) {
    console.warn("Contact settings are temporarily unavailable.", error);
  }
}

function openSpecialistTelegram() {
  window.open(specialistTelegramUrl, "_blank", "noopener,noreferrer");
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
  slides.forEach((slide) => {
    slide.setAttribute("role", "link");
    slide.setAttribute("tabindex", "0");
    slide.addEventListener("click", openSpecialistTelegram);
    slide.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSpecialistTelegram();
      }
    });
  });
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

function startVideoSwipe(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  videoSwipeStartX = event.clientX;
  videoSwipeStartY = event.clientY;
  isVideoSwiping = true;
}

function finishVideoSwipe(event) {
  if (!isVideoSwiping) {
    return;
  }

  const deltaX = event.clientX - videoSwipeStartX;
  const deltaY = event.clientY - videoSwipeStartY;
  isVideoSwiping = false;

  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) {
    return;
  }

  showVideo(activeVideo + (deltaX < 0 ? 1 : -1));
}

if (videoSlides.length) {
  showVideo(0);

  videoDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showVideo(index);
    });
  });

  document.querySelector(".video-carousel")?.addEventListener("pointerdown", startVideoSwipe);
  document.querySelector(".video-carousel")?.addEventListener("pointerup", finishVideoSwipe);
  document.querySelector(".video-carousel")?.addEventListener("pointercancel", () => {
    isVideoSwiping = false;
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

specialistButton?.addEventListener("click", () => {
  if (!contactSection) {
    return;
  }

  window.setTimeout(() => {
    contactSection.classList.remove("is-guided");
    contactSection.getBoundingClientRect();
    contactSection.classList.add("is-guided");
  }, 480);
});

contactSection?.addEventListener("animationend", (event) => {
  if (event.animationName === "contactGuidePulse") {
    contactSection.classList.remove("is-guided");
  }
});

winModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-modal-close]")) {
    closeWinModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && winModal && !winModal.hidden) {
    closeWinModal();
  }
});

centerSpinButton?.addEventListener("click", spinFormFromCenter);

languageSelect?.addEventListener("change", (event) => {
  applyLanguage(event.target.value);
});

applyLanguage(languageSelect?.value || "zh");
initializeContactSettings();
startWinnerFeed();
startIdleSpin();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSpinning) {
    return;
  }

  const member = memberName.value.trim();
  const redemptionCodeValue = redemptionCode.value.trim();
  const telegram = telegramName.value.trim().replace(/\s+/g, "");

  if (!member || !redemptionCodeValue) {
    showMessage(t("missingFields"));
    form.reportValidity();
    return;
  }

  if (isPromoComplete) {
    showMessage(t("completedMessage"));
    return;
  }

  button.disabled = true;
  if (centerSpinButton) centerSpinButton.disabled = true;
  showMessage(currentLanguage === "zh" ? "正在验证账号和兑换码…" : "Verifying account and redemption code…");
  let selected;

  try {
    const redemption = await redeemEligibility({
      member,
      redemptionCode: redemptionCodeValue,
      telegram: telegram ? normalizeTelegramName(telegram) : "—",
    });
    selected = outcomeForPrize(redemption.prize);
  } catch (error) {
    const errorMessages = {
      INVALID_CODE: currentLanguage === "zh" ? "兑换码无效，请联系工作人员。" : "Invalid redemption code. Please contact a specialist.",
      CODE_USED: currentLanguage === "zh" ? "此兑换码已使用或已停用。" : "This redemption code has already been used or disabled.",
      ACCOUNT_MISMATCH: currentLanguage === "zh" ? "会员账号与兑换码不匹配。" : "The member account does not match this redemption code.",
    };
    showMessage(errorMessages[error.message] || (currentLanguage === "zh" ? "暂时无法验证，请稍后重试。" : "Unable to verify right now. Please try again."));
    button.disabled = false;
    if (centerSpinButton) centerSpinButton.disabled = false;
    return;
  }

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
  button.textContent = t("spinning");
  showMessage(t("matchingPrefix"), strongText(member), t("matchingSuffix"));

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
    isPromoComplete = true;
    updateChanceMeter();

    {
      const amount = `${selected.prize}U`;
      const claim = createClaimDetails(amount, member, redemptionCodeValue, telegram);
      storeClaimDetails(claim);
      button.disabled = true;
      if (centerSpinButton) {
        centerSpinButton.disabled = true;
      }
      button.textContent = t("prizeLockedButton");
      launchGoldRain();
      launchConfetti();
      showMessage(
        t("winPrefix"),
        strongText(member),
        t("winMiddle"),
        strongText(amount),
        t("winSuffix"),
        strongText(claim.telegram),
        t("winContact")
      );
      openWinModal(claim);
      return;
    }
  }, 4470);
});
