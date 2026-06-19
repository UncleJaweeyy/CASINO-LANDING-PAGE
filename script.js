const wheel = document.querySelector("#wheel");
const form = document.querySelector("#spinForm");
const button = document.querySelector("#spinButton");
const message = document.querySelector("#spinMessage");
const memberName = document.querySelector("#memberName");
const telegramName = document.querySelector("#telegramName");

const prizes = [38, 88, 108, 188, 288, 588, 888, 288, 588, 888];
const eligibleIndexes = prizes
  .map((prize, index) => ({ prize, index }))
  .filter(({ prize }) => ![38, 88, 108, 188].includes(prize));

let rotation = 0;
let isSpinning = false;
let resultTimer;

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function pickPrize() {
  return eligibleIndexes[Math.floor(Math.random() * eligibleIndexes.length)];
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

  const selected = pickPrize();
  const segmentAngle = 36;
  const currentSelectedAngle = normalizeDegrees(selected.index * segmentAngle + rotation);
  const deltaToPointer = normalizeDegrees(360 - currentSelectedAngle);

  isSpinning = true;
  button.disabled = true;
  button.textContent = "旋转中";
  showMessage("会员 ", strongText(member), " 正在匹配专属礼金...");

  rotation += 360 * 6 + deltaToPointer;
  wheel.style.transform = `rotate(${rotation}deg)`;

  window.clearTimeout(resultTimer);
  resultTimer = window.setTimeout(() => {
    isSpinning = false;
    button.disabled = false;
    button.textContent = "再次旋转";
    launchGoldRain();
    showMessage(
      "恭喜 ",
      strongText(member),
      " 抽中 ",
      strongText(`${selected.prize}U`),
      "！请使用 ",
      strongText(normalizeTelegramName(telegram)),
      " 联系领奖专员核实。"
    );
  }, 4300);
});
