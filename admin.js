import { adminApi, auth } from "./firebase-client.js";

const $ = (selector) => document.querySelector(selector);
const loginView = $("#loginView");
const dashboardView = $("#dashboardView");
const eligibilityDialog = $("#eligibilityDialog");
const videoDialog = $("#videoDialog");
let eligibilityRecords = [];
let claimRecords = [];
let videoRecords = [];
let unsubEligibility;
let unsubClaims;

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));
const formatDate = (timestamp) => timestamp?.toDate ? timestamp.toDate().toLocaleString() : "—";
const badge = (status) => `<span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>`;
const defaultVideos = [
  { id: "default-1", title: "Winner highlight 1", url: "https://res.cloudinary.com/ftvkjbip/video/upload/v1782881287/video01_sbhx84.mp4", enabled: true },
  { id: "default-2", title: "Winner highlight 2", url: "https://res.cloudinary.com/ftvkjbip/video/upload/v1782881270/video02_zgxaro.mp4", enabled: true },
  { id: "default-3", title: "Winner highlight 3", url: "https://res.cloudinary.com/ftvkjbip/video/upload/v1782881284/video03_icfab9.mp4", enabled: true },
  { id: "default-4", title: "Winner highlight 4", url: "https://res.cloudinary.com/ftvkjbip/video/upload/v1782881292/video04_q4srre.mp4", enabled: true },
  { id: "default-5", title: "Winner highlight 5", url: "https://res.cloudinary.com/ftvkjbip/video/upload/v1782881292/video05_gzyqio.mp4", enabled: true },
];

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function setView(isAdmin, user) {
  loginView.hidden = isAdmin;
  dashboardView.hidden = !isAdmin;
  if (isAdmin) $("#adminEmail").textContent = user.email;
}

function renderStats() {
  $("#totalEligibility").textContent = eligibilityRecords.length;
  $("#activeEligibility").textContent = eligibilityRecords.filter((item) => item.status === "active").length;
  $("#pendingClaims").textContent = claimRecords.filter((item) => item.status === "pending").length;
}

function renderEligibilities() {
  const term = $("#eligibilitySearch").value.trim().toLowerCase();
  const status = $("#eligibilityFilter").value;
  const records = eligibilityRecords.filter((record) => {
    const matchesTerm = `${record.memberAccount} ${record.redemptionCode}`.toLowerCase().includes(term);
    return matchesTerm && (status === "all" || record.status === status);
  });
  $("#eligibilityRows").innerHTML = records.map((record) => `<tr>
    <td><strong>${escapeHtml(record.memberAccount)}</strong></td>
    <td>${escapeHtml(record.redemptionCode)}</td>
    <td>${badge(record.status)}</td>
    <td>${escapeHtml(record.notes || "—")}</td>
    <td>${formatDate(record.createdAt)}</td>
    <td><div class="row-actions"><button data-edit-eligibility="${escapeHtml(record.id)}">Edit</button><button class="delete" data-delete-eligibility="${escapeHtml(record.id)}">Delete</button></div></td>
  </tr>`).join("");
  $("#eligibilityEmpty").hidden = records.length > 0;
  renderStats();
}

function renderClaims() {
  const term = $("#claimSearch").value.trim().toLowerCase();
  const status = $("#claimFilter").value;
  const records = claimRecords.filter((record) => {
    const matchesTerm = `${record.memberAccount} ${record.redemptionCode} ${record.telegram}`.toLowerCase().includes(term);
    return matchesTerm && (status === "all" || record.status === status);
  });
  $("#claimRows").innerHTML = records.map((record) => `<tr>
    <td><strong>${escapeHtml(record.memberAccount)}</strong></td><td>${escapeHtml(record.redemptionCode)}</td>
    <td>${escapeHtml(record.telegram)}</td><td><strong>${escapeHtml(record.prize)}</strong></td>
    <td><select data-claim-status="${record.id}"><option value="pending" ${record.status === "pending" ? "selected" : ""}>Pending</option><option value="verified" ${record.status === "verified" ? "selected" : ""}>Verified</option><option value="paid" ${record.status === "paid" ? "selected" : ""}>Paid</option><option value="rejected" ${record.status === "rejected" ? "selected" : ""}>Rejected</option></select></td>
    <td>${formatDate(record.createdAt)}</td><td><div class="row-actions"><button class="delete" data-delete-claim="${record.id}">Delete</button></div></td>
  </tr>`).join("");
  $("#claimEmpty").hidden = records.length > 0;
  renderStats();
}

function markVideosChanged() {
  $("#videoSaveStatus").textContent = "Unsaved changes";
}

function renderVideos() {
  $("#videoAdminList").innerHTML = videoRecords.map((video, index) => `<article class="video-admin-item ${video.enabled === false ? "is-disabled" : ""}">
    <video src="${escapeHtml(video.url)}" muted playsinline preload="metadata"></video>
    <div class="video-admin-copy"><strong>${escapeHtml(video.title || `Video ${index + 1}`)}</strong><span>${escapeHtml(video.url)}</span>${badge(video.enabled === false ? "disabled" : "active")}</div>
    <div class="video-admin-actions">
      <button data-video-up="${escapeHtml(video.id)}" ${index === 0 ? "disabled" : ""}>↑ Up</button>
      <button data-video-down="${escapeHtml(video.id)}" ${index === videoRecords.length - 1 ? "disabled" : ""}>↓ Down</button>
      <button data-video-toggle="${escapeHtml(video.id)}">${video.enabled === false ? "Enable" : "Disable"}</button>
      <button data-video-edit="${escapeHtml(video.id)}">Edit</button>
      <button class="delete" data-video-delete="${escapeHtml(video.id)}">Delete</button>
    </div>
  </article>`).join("");
  $("#videoEmpty").hidden = videoRecords.length > 0;
}

function openVideo(record) {
  $("#videoDialogTitle").textContent = record ? "Edit video" : "Add video";
  $("#videoIdInput").value = record?.id || "";
  $("#videoTitleInput").value = record?.title || "";
  $("#videoUrlInput").value = record?.url || "";
  $("#videoEnabledInput").checked = record?.enabled !== false;
  $("#videoMessage").textContent = "";
  updateVideoPreview();
  videoDialog.showModal();
}

function updateVideoPreview() {
  const url = $("#videoUrlInput").value.trim();
  const preview = $("#videoPreview");
  const container = preview.closest(".video-preview");
  if (/^https:\/\//i.test(url)) {
    if (preview.src !== url) preview.src = url;
    container.classList.add("has-video");
  } else {
    preview.removeAttribute("src");
    preview.load();
    container.classList.remove("has-video");
  }
}

function openEligibility(record) {
  $("#eligibilityDialogTitle").textContent = record ? "Edit member" : "Add member";
  $("#originalCode").value = record?.id || "";
  $("#memberAccountInput").value = record?.memberAccount || "";
  $("#redemptionCodeInput").value = record?.redemptionCode || "";
  $("#eligibilityStatus").value = record?.status || "active";
  $("#eligibilityNotes").value = record?.notes || "";
  $("#eligibilityMessage").textContent = "";
  eligibilityDialog.showModal();
}

async function startDashboard(user) {
  setView(true, user);
  const onError = (error) => showToast(error.message || "Unable to load data");
  unsubEligibility = adminApi.watchEligibilities((snapshot) => {
    eligibilityRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderEligibilities();
  }, onError);
  unsubClaims = adminApi.watchClaims((snapshot) => {
    claimRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderClaims();
  }, onError);
  const settings = await adminApi.loadSettings();
  $("#telegramSetting").value = settings.telegram || "";
  $("#whatsappSetting").value = settings.whatsapp || "";
  const managedVideos = await adminApi.loadVideos();
  videoRecords = (managedVideos === null ? defaultVideos : managedVideos).map((video, index) => ({ ...video, order: index }));
  renderVideos();
}

adminApi.onAuthStateChanged(auth, async (user) => {
  unsubEligibility?.(); unsubClaims?.();
  if (user && await adminApi.isAdmin(user)) return startDashboard(user);
  if (user) await adminApi.signOut();
  setView(false);
});

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#loginMessage");
  message.textContent = "Signing in…";
  try {
    const credential = await adminApi.signIn($("#loginEmail").value.trim(), $("#loginPassword").value);
    if (!await adminApi.isAdmin(credential.user)) throw new Error("This account is not authorized as an administrator.");
    message.textContent = "";
  } catch (error) {
    message.textContent = error.message.replace("Firebase: ", "");
    await adminApi.signOut().catch(() => {});
  }
});

$("#signOutButton").addEventListener("click", () => adminApi.signOut());
document.querySelectorAll(".tabs button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach((item) => item.classList.toggle("active", item === button));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  $(`#${button.dataset.tab}Panel`).classList.add("active");
}));
$("#eligibilitySearch").addEventListener("input", renderEligibilities);
$("#eligibilityFilter").addEventListener("change", renderEligibilities);
$("#claimSearch").addEventListener("input", renderClaims);
$("#claimFilter").addEventListener("change", renderClaims);
$("#addEligibilityButton").addEventListener("click", () => openEligibility());
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => eligibilityDialog.close()));
document.querySelectorAll("[data-close-video-dialog]").forEach((button) => button.addEventListener("click", () => videoDialog.close()));
$("#addVideoButton").addEventListener("click", () => openVideo());
$("#videoUrlInput").addEventListener("input", updateVideoPreview);

$("#videoForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const url = $("#videoUrlInput").value.trim();
  if (!/^https:\/\//i.test(url)) {
    $("#videoMessage").textContent = "Enter a valid HTTPS video URL.";
    return;
  }
  const id = $("#videoIdInput").value || (crypto.randomUUID?.() || `video-${Date.now()}`);
  const record = { id, title: $("#videoTitleInput").value.trim(), url, enabled: $("#videoEnabledInput").checked };
  const existingIndex = videoRecords.findIndex((video) => video.id === id);
  if (existingIndex >= 0) videoRecords[existingIndex] = record;
  else videoRecords.push(record);
  renderVideos(); markVideosChanged(); videoDialog.close();
});

$("#videoAdminList").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.videoEdit || button.dataset.videoDelete || button.dataset.videoToggle || button.dataset.videoUp || button.dataset.videoDown;
  const index = videoRecords.findIndex((video) => video.id === id);
  if (index < 0) return;
  if (button.dataset.videoEdit) return openVideo(videoRecords[index]);
  if (button.dataset.videoDelete && !confirm(`Delete ${videoRecords[index].title || "this video"}?`)) return;
  if (button.dataset.videoDelete) videoRecords.splice(index, 1);
  if (button.dataset.videoToggle) videoRecords[index].enabled = videoRecords[index].enabled === false;
  if (button.dataset.videoUp && index > 0) [videoRecords[index - 1], videoRecords[index]] = [videoRecords[index], videoRecords[index - 1]];
  if (button.dataset.videoDown && index < videoRecords.length - 1) [videoRecords[index + 1], videoRecords[index]] = [videoRecords[index], videoRecords[index + 1]];
  renderVideos(); markVideosChanged();
});

$("#saveVideosButton").addEventListener("click", async () => {
  const button = $("#saveVideosButton");
  button.disabled = true;
  $("#videoSaveStatus").textContent = "Saving…";
  try {
    await adminApi.saveVideos(videoRecords);
    $("#videoSaveStatus").textContent = "Saved. The live carousel updates on its next page load.";
    showToast("Videos updated");
  } catch (error) {
    $("#videoSaveStatus").textContent = error.message || "Unable to save videos";
  } finally { button.disabled = false; }
});

$("#eligibilityRows").addEventListener("click", async (event) => {
  const editId = event.target.dataset.editEligibility;
  const deleteId = event.target.dataset.deleteEligibility;
  if (editId) openEligibility(eligibilityRecords.find((record) => record.id === editId));
  if (deleteId && confirm(`Delete redemption code ${deleteId}?`)) {
    await adminApi.deleteEligibility(deleteId); showToast("Eligibility deleted");
  }
});

$("#eligibilityForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#eligibilityMessage");
  message.textContent = "Saving…";
  try {
    await adminApi.saveEligibility($("#originalCode").value, {
      memberAccount: $("#memberAccountInput").value,
      redemptionCode: $("#redemptionCodeInput").value,
      status: $("#eligibilityStatus").value,
      notes: $("#eligibilityNotes").value,
    });
    eligibilityDialog.close(); showToast("Eligibility saved");
  } catch (error) { message.textContent = error.message; }
});

$("#claimRows").addEventListener("change", async (event) => {
  if (!event.target.dataset.claimStatus) return;
  await adminApi.updateClaim(event.target.dataset.claimStatus, { status: event.target.value });
  showToast("Claim status updated");
});
$("#claimRows").addEventListener("click", async (event) => {
  const id = event.target.dataset.deleteClaim;
  if (id && confirm("Delete this claim record?")) { await adminApi.deleteClaim(id); showToast("Claim deleted"); }
});
$("#settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#settingsMessage"); message.textContent = "Saving…";
  try {
    await adminApi.saveSettings({ telegram: $("#telegramSetting").value, whatsapp: $("#whatsappSetting").value });
    message.textContent = "Contact links saved."; showToast("Contact links updated");
  } catch (error) { message.textContent = error.message; }
});
