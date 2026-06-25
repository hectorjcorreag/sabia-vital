import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getUserProfile(uid: string) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Firestore profile error:", e);
    return "OFFLINE";
  }
}