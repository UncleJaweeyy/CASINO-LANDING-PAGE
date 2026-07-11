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

export function normalizeCode(value) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeAccount(value) {
  return value.trim().toLowerCase();
}

export async function loadPublicSettings() {
  const snapshot = await getDoc(doc(db, "settings", "contact"));
  return snapshot.exists() ? snapshot.data() : { telegram: "kaiye9998", whatsapp: "" };
}

export async function validateEligibility(member, redemptionCode) {
  const snapshot = await getDoc(doc(db, "eligibilities", normalizeCode(redemptionCode)));
  if (!snapshot.exists()) throw new Error("INVALID_CODE");
  const eligibility = snapshot.data();
  if (eligibility.status !== "active" || eligibility.used === true) throw new Error("CODE_USED");
  if (normalizeAccount(eligibility.memberAccount || "") !== normalizeAccount(member)) throw new Error("ACCOUNT_MISMATCH");
  return true;
}

export async function redeemEligibility({ member, redemptionCode, telegram, prize }) {
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
    return claimRef.id;
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
  saveSettings: (values) => setDoc(doc(db, "settings", "contact"), {
    telegram: values.telegram.trim().replace(/^@/, ""),
    whatsapp: values.whatsapp.replace(/\D/g, ""),
    updatedAt: serverTimestamp(),
  }, { merge: true }),
  loadSettings: loadPublicSettings,
};
