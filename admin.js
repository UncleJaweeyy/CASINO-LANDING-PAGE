import { adminApi, auth } from "./firebase-client.js";

const $ = (selector) => document.querySelector(selector);
const loginView = $("#loginView");
const dashboardView = $("#dashboardView");
const eligibilityDialog = $("#eligibilityDialog");
let eligibilityRecords = [];
let claimRecords = [];
let unsubEligibility;
let unsubClaims;

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));
const formatDate = (timestamp) => timestamp?.toDate ? timestamp.toDate().toLocaleString() : "—";
const badge = (status) => `<span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>`;

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
