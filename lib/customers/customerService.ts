import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import { User } from "firebase/auth";

import { db } from "@/lib/firebase";

import {
  ExistingCustomer,
  MerchandiserProfile,
  NewReferralFormData,
  SellerOption,
} from "./customerTypes";

import {
  getSellerFullName,
  getUserDisplayName,
  monthKeyFromDateKey,
  normalizePhone,
  todayBogotaKey,
} from "./customerUtils";

export async function loadMerchandiserProfile(user: User) {
  let rawProfile: any = null;

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (userSnap.exists()) {
    rawProfile = userSnap.data();
  } else {
    const profileSnap = await getDoc(doc(db, "profiles", user.uid));

    if (profileSnap.exists()) {
      rawProfile = profileSnap.data();
    }
  }

  const displayName = getUserDisplayName(
    rawProfile || {},
    user.displayName || user.email || "Mercaderista"
  );

  const profile: MerchandiserProfile = {
    uid: user.uid,
    displayName,
    role: rawProfile?.role || rawProfile?.type || "merchandiser",
    merchandiserId:
      rawProfile?.merchandiserId ||
      rawProfile?.profile?.id ||
      rawProfile?.id ||
      user.uid,
    merchandiserName:
      rawProfile?.merchandiserName || rawProfile?.name || displayName,
    canManageAllSellers: Boolean(rawProfile?.canManageAllSellers),
  };

  return profile;
}

export async function loadAllActiveSellers() {
  const q = query(collection(db, "sellers"), orderBy("firstName", "asc"));
  const snap = await getDocs(q);

  const sellers: SellerOption[] = snap.docs
    .map((docSnap) => {
      const raw = docSnap.data() as any;

      return {
        id: docSnap.id,
        name: getSellerFullName(raw),
        distributorId: raw.distributorId || raw.distributor?.id || "",
        distributorName:
          raw.distributorName ||
          raw.distributor?.name ||
          raw.distributor?.businessName ||
          "",
        uid: raw.uid || raw.userUid || raw.authUid || "",
        active: raw.active !== false,

        // Aquí está el ajuste importante
        photoUrl: extractSellerPhotoUrl(raw),

        documentNumber:
          raw.documentNumber ||
          raw.document ||
          raw.identification ||
          raw.personal?.documentNumber ||
          raw.personal?.document ||
          "",
      };
    })
    .filter((seller) => seller.active && seller.name !== "Sin nombre")
    .sort((a, b) => a.name.localeCompare(b.name));

  return sellers;
}

export async function loadAssignedSellerIds(profile: MerchandiserProfile) {
  const merchandiserId = profile.merchandiserId || profile.uid;

  const q = query(
    collection(db, "merchandiser_seller_assignments"),
    where("merchandiserId", "==", merchandiserId),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((docSnap) => {
      const raw = docSnap.data() as any;
      return raw.sellerId || "";
    })
    .filter(Boolean);
}

export async function loadAllowedSellersForMerchandiser(
  profile: MerchandiserProfile
) {
  const allSellers = await loadAllActiveSellers();

  if (profile.canManageAllSellers) {
    return allSellers;
  }

  const assignedSellerIds = await loadAssignedSellerIds(profile);

  if (assignedSellerIds.length === 0) {
    return allSellers;
  }

  return allSellers.filter((seller) => assignedSellerIds.includes(seller.id));
}

export async function findCustomerByPhone(phoneNormalized: string) {
  if (phoneNormalized.length < 7) {
    return null;
  }

  const q = query(
    collection(db, "customers"),
    where("phoneNormalized", "==", phoneNormalized),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const docSnap = snap.docs[0];

  const customer: ExistingCustomer = {
    id: docSnap.id,
    ...(docSnap.data() as any),
  };

  return customer;
}

export async function createReferralCustomer(args: {
  user: User;
  profile: MerchandiserProfile;
  selectedSeller: SellerOption;
  formData: NewReferralFormData;
}) {
  const { user, profile, selectedSeller, formData } = args;

  const phoneNormalized = normalizePhone(formData.phone);
  const secondaryPhoneNormalized = normalizePhone(formData.secondaryPhone);
  const createdDateKey = todayBogotaKey();

  const duplicate = await findCustomerByPhone(phoneNormalized);

  if (duplicate) {
    throw new Error("Este teléfono ya existe en el sistema. No se puede crear duplicado.");
  }

  const docRef = await addDoc(collection(db, "customers"), {
    fullName: formData.fullName.trim(),
    phone: formData.phone.trim(),
    phoneNormalized,
    secondaryPhone: formData.secondaryPhone.trim(),
    secondaryPhoneNormalized,
    email: formData.email.trim().toLowerCase(),
    city: formData.city.trim(),
    address: formData.address.trim(),

    customerType: "referido",
    customerStatus: "nuevo",

    source: "mercaderista",
    origin: "referido_manual",
    interestProduct: formData.interestProduct.trim(),

    assignedSellerId: selectedSeller.id,
    assignedSellerName: selectedSeller.name,
    assignedSellerUid: selectedSeller.uid || "",

    assignedMerchandiserId: profile.merchandiserId || profile.uid,
    assignedMerchandiserName: profile.merchandiserName || profile.displayName,
    assignedMerchandiserUid: profile.uid,

    visibleToSellerIds: [selectedSeller.id],
    visibleToSellerUids: selectedSeller.uid ? [selectedSeller.uid] : [],

    visibleToMerchandiserIds: [profile.merchandiserId || profile.uid],
    visibleToMerchandiserUids: [profile.uid],

    priority: 80,
    nextActionAt: Timestamp.now(),

    callAttempts: 0,
    lastCallAt: null,
    lastCallResult: "",
    lastObservation: formData.initialObservation.trim(),
    nextCallAt: null,

    hasAppointment: false,
    nextAppointmentId: "",
    nextAppointmentAt: null,

    hasPurchase: false,
    firstPurchaseAt: null,
    totalPurchases: 0,
    totalPurchasedAmount: 0,

    duplicateOfCustomerId: "",
    duplicateReason: "",

    createdByRole: "merchandiser",
    createdById: profile.merchandiserId || profile.uid,
    createdByUid: user.uid,
    createdByName: profile.merchandiserName || profile.displayName,

    createdAt: serverTimestamp(),
    createdDateKey,
    createdMonthKey: monthKeyFromDateKey(createdDateKey),

    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}
function extractSellerPhotoUrl(raw: any) {
  return (
    raw.photo?.url ||
    raw.photoUrl ||
    raw.photoURL ||
    raw.imageUrl ||
    raw.imageURL ||
    raw.avatarUrl ||
    raw.avatarURL ||
    raw.profilePhotoUrl ||
    raw.profilePhotoURL ||
    raw.personal?.photo?.url ||
    raw.personal?.photoUrl ||
    raw.personal?.photoURL ||
    raw.documents?.photo?.url ||
    raw.files?.photo?.url ||
    ""
  );
}