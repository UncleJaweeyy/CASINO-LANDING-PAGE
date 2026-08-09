import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtRsc4d6fTeLM1_JyfrgYF0-3ax35ioWY",
  authDomain: "winbox-bonus-wheel-2026.firebaseapp.com",
  projectId: "winbox-bonus-wheel-2026",
  storageBucket: "winbox-bonus-wheel-2026.firebasestorage.app",
  messagingSenderId: "90657562915",
  appId: "1:90657562915:web:0d8e7ac55293bc0c5a2c96",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export function normalizeCode(value) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeAccount(value) {
  return value.trim().toLowerCase();
}

export async function loadPublicSettings() {
  const snapshot = await getDoc(doc(db, "settings", "contact"));
  return {
    telegram: "kaiye9998",
    whatsapp: "",
    promotionUrl: "https://t.me/dev_1xroll_test_bot",
    ...(snapshot.exists() ? snapshot.data() : {}),
  };
}

function firebaseStorageVideoUrl(number) {
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/public%2Fvideos%2Fvideo0${number}.mp4?alt=media`;
}

const googleDriveVideoIds = {
  1: "1qycsdNQuWnB6q2P7SgW4XfAlKicEcCvi",
  2: "1YyFS_sxhENJNnTTz-GCJ6ym-Ukn1zmX9",
  3: "1ZHK7Q_iATMX9ZmH_0vnAhiGud7fm1630",
  4: "1YQ4nB66j1VvQz5eYzN6Uc5mGsroWQmpL",
  5: "1M3JsM_SwzSu-4z7mIB4Ac4SDv_ugQ515",
};

function googleDriveVideoUrl(number) {
  return `https://drive.google.com/uc?export=download&id=${googleDriveVideoIds[number]}`;
}

function normalizeVideoUrl(value) {
  const url = String(value || "").trim();
  const legacyCloudinaryVideo = /^https:\/\/res\.cloudinary\.com\//i.test(url)
    ? url.match(/\/video0([1-5])(?:_[^/?#]+)?\.mp4(?:[?#].*)?$/i)
    : null;
  const bundledVideo = url.match(/^\/?assets\/videos\/video0([1-5])\.mp4(?:[?#].*)?$/i);
  const migratedVideoNumber = legacyCloudinaryVideo?.[1] || bundledVideo?.[1];
  return migratedVideoNumber ? firebaseStorageVideoUrl(migratedVideoNumber) : url;
}

function isSupportedVideoUrl(value) {
  return /^https:\/\//i.test(value) || /^\/?assets\/videos\/[^?#]+\.mp4(?:[?#].*)?$/i.test(value);
}

function preferGoogleDriveForBundledVideo(video) {
  const normalizedUrl = normalizeVideoUrl(video.url);
  const bundledStorageVideo = normalizedUrl.match(/public%2Fvideos%2Fvideo0([1-5])\.mp4/i);
  if (!bundledStorageVideo) return { ...video, url: normalizedUrl };
  return {
    ...video,
    url: googleDriveVideoUrl(bundledStorageVideo[1]),
    fallbackUrl: normalizedUrl,
  };
}

export async function loadPublicVideos() {
  const snapshot = await getDoc(doc(db, "settings", "videos"));
  if (!snapshot.exists()) return null;
  const videos = Array.isArray(snapshot.data().items) ? snapshot.data().items : [];
  return videos
    .filter((video) => video && video.enabled !== false)
    .map(preferGoogleDriveForBundledVideo)
    .filter((video) => isSupportedVideoUrl(video.url))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function validateEligibility(member, redemptionCode) {
  const snapshot = await getDoc(doc(db, "eligibilities", normalizeCode(redemptionCode)));
  if (!snapshot.exists()) throw new Error("INVALID_CODE");
  const eligibility = snapshot.data();
  if (eligibility.status !== "active" || eligibility.used === true) throw new Error("CODE_USED");
  if (normalizeAccount(eligibility.memberAccount || "") !== normalizeAccount(member)) throw new Error("ACCOUNT_MISMATCH");
  return eligibility.prize || "38U";
}

export async function redeemEligibility({ member, redemptionCode, telegram }) {
  const code = normalizeCode(redemptionCode);
  const account = normalizeAccount(member);
  const eligibilityRef = doc(db, "eligibilities", code);
  const claimRef = doc(collection(db, "claims"));

  return runTransaction(db, async (transaction) => {
    const eligibilitySnapshot = await transaction.get(eligibilityRef);
    if (!eligibilitySnapshot.exists()) throw new Error("INVALID_CODE");

    const eligibility = eligibilitySnapshot.data();
    if (eligibility.status !== "active" || eligibility.used === true) throw new Error("CODE_USED");
    if (normalizeAccount(eligibility.memberAccount || "") !== account) throw new Error("ACCOUNT_MISMATCH");
    const prize = eligibility.prize || "38U";

    transaction.update(eligibilityRef, {
      used: true,
      status: "used",
      usedAt: serverTimestamp(),
      claimId: claimRef.id,
      updatedAt: serverTimestamp(),
    });
    transaction.set(claimRef, {
      memberAccount: member.trim(),
      redemptionCode: code,
      telegram: telegram.trim(),
      prize,
      status: "pending",
      eligibilityId: code,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { claimId: claimRef.id, prize };
  });
}

export const adminApi = {
  onAuthStateChanged,
  signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
  signOut: () => signOut(auth),
  async isAdmin(user) {
    if (!user) return false;
    return (await getDoc(doc(db, "admins", user.uid))).exists();
  },
  watchEligibilities(callback, onError) {
    return onSnapshot(query(collection(db, "eligibilities"), orderBy("createdAt", "desc")), callback, onError);
  },
  watchClaims(callback, onError) {
    return onSnapshot(query(collection(db, "claims"), orderBy("createdAt", "desc")), callback, onError);
  },
  async saveEligibility(originalCode, values) {
    const code = normalizeCode(values.redemptionCode);
    const payload = {
      memberAccount: values.memberAccount.trim(),
      redemptionCode: code,
      prize: values.prize || "38U",
      status: values.status,
      used: values.status === "used",
      notes: values.notes.trim(),
      updatedAt: serverTimestamp(),
    };
    if (!originalCode) payload.createdAt = serverTimestamp();
    await setDoc(doc(db, "eligibilities", code), payload, { merge: true });
    if (originalCode && normalizeCode(originalCode) !== code) {
      await deleteDoc(doc(db, "eligibilities", normalizeCode(originalCode)));
    }
  },
  deleteEligibility: (code) => deleteDoc(doc(db, "eligibilities", normalizeCode(code))),
  updateClaim: (id, values) => updateDoc(doc(db, "claims", id), { ...values, updatedAt: serverTimestamp() }),
  deleteClaim: (id) => deleteDoc(doc(db, "claims", id)),
  saveSettings: (values) => {
    const promotionDestination = values.promotionUrl.trim();
    const promotionUrl = /^@?[A-Za-z0-9_]{5,}$/.test(promotionDestination)
      ? `https://t.me/${promotionDestination.replace(/^@/, "")}`
      : promotionDestination;
    if (!/^https:\/\//i.test(promotionUrl)) {
      throw new Error("Enter a Telegram username or a full HTTPS link.");
    }

    return setDoc(doc(db, "settings", "contact"), {
      telegram: values.telegram.trim().replace(/^@/, ""),
      whatsapp: values.whatsapp.replace(/\D/g, ""),
      promotionUrl,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },
  loadSettings: loadPublicSettings,
  loadVideos: async () => {
    const snapshot = await getDoc(doc(db, "settings", "videos"));
    return snapshot.exists() && Array.isArray(snapshot.data().items)
      ? snapshot.data().items.map((video) => ({ ...video, url: normalizeVideoUrl(video.url) }))
      : null;
  },
  uploadVideo(file, onProgress = () => {}) {
    const isMp4 = file instanceof File
      && /\.mp4$/i.test(file.name)
      && (!file.type || file.type === "video/mp4");
    if (!isMp4) throw new Error("Choose a valid MP4 video file.");
    if (file.size > 200 * 1024 * 1024) throw new Error("Video files must be 200 MB or smaller.");

    const safeStem = file.name
      .replace(/\.mp4$/i, "")
      .normalize("NFKD")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "video";
    const uniqueId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const storagePath = `public/videos/${Date.now()}-${uniqueId}-${safeStem}.mp4`;
    const upload = uploadBytesResumable(storageRef(storage, storagePath), file, {
      contentType: "video/mp4",
      cacheControl: "public,max-age=86400",
    });

    return new Promise((resolve, reject) => {
      upload.on(
        "state_changed",
        (snapshot) => onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        reject,
        async () => {
          try {
            resolve({ url: await getDownloadURL(upload.snapshot.ref), storagePath });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  },
  saveVideos: (items) => setDoc(doc(db, "settings", "videos"), {
    items: items.map((item, index) => ({
      id: String(item.id),
      title: String(item.title || "").trim(),
      url: String(item.url || "").trim(),
      storagePath: String(item.storagePath || "").trim(),
      enabled: item.enabled !== false,
      order: index,
    })),
    updatedAt: serverTimestamp(),
  }),
};
