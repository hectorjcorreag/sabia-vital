"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type CurrentUserProfile = {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  role: string | null;
  activo: boolean;
  estado: string | null;

  sellerId: string | null;
  distributorId: string | null;
  mercaderistaId: string | null;

  assignedName: string | null;
  assignedPhotoURL: string | null;
};

type AssignedProfile = {
  assignedName: string | null;
  assignedPhotoURL: string | null;
};

function getTextValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

async function getAssignedProfile(userData: Record<string, any>): Promise<AssignedProfile> {
  const role = String(userData?.role || "").toLowerCase().trim();

  try {
    if (role === "vendedor" && userData?.sellerId) {
      const sellerRef = doc(db, "sellers", String(userData.sellerId));
      const sellerSnap = await getDoc(sellerRef);

      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data();

        return {
          assignedName: getTextValue(
            sellerData.displayName,
            sellerData.name,
            sellerData.nombre,
            sellerData.fullName
          ),

          assignedPhotoURL: getTextValue(
            sellerData.photo?.url,
            sellerData.photoURL,
            sellerData.imageURL,
            sellerData.avatarURL,
            sellerData.logoURL
          ),
        };
      }
    }

    if (role === "distribuidor" && userData?.distributorId) {
      const distributorRef = doc(
        db,
        "distributors",
        String(userData.distributorId)
      );
      const distributorSnap = await getDoc(distributorRef);

      if (distributorSnap.exists()) {
        const distributorData = distributorSnap.data();

        return {
          assignedName: getTextValue(
            distributorData.displayName,
            distributorData.name,
            distributorData.nombre,
            distributorData.businessName,
            distributorData.razonSocial
          ),

          assignedPhotoURL: getTextValue(
            distributorData.logo?.url,
            distributorData.photo?.url,
            distributorData.logoURL,
            distributorData.photoURL,
            distributorData.imageURL,
            distributorData.avatarURL
          ),
        };
      }
    }

    if (role === "mercaderista" && userData?.mercaderistaId) {
      const mercaderistaRef = doc(
        db,
        "mercaderistas",
        String(userData.mercaderistaId)
      );
      const mercaderistaSnap = await getDoc(mercaderistaRef);

      if (mercaderistaSnap.exists()) {
        const mercaderistaData = mercaderistaSnap.data();

        return {
          assignedName: getTextValue(
            mercaderistaData.displayName,
            mercaderistaData.name,
            mercaderistaData.nombre,
            mercaderistaData.fullName
          ),

          assignedPhotoURL: getTextValue(
            mercaderistaData.photo?.url,
            mercaderistaData.logo?.url,
            mercaderistaData.photoURL,
            mercaderistaData.imageURL,
            mercaderistaData.avatarURL,
            mercaderistaData.logoURL
          ),
        };
      }
    }

    return {
      assignedName: null,
      assignedPhotoURL: null,
    };
  } catch (error) {
    console.error("Error cargando perfil asignado:", error);

    return {
      assignedName: null,
      assignedPhotoURL: null,
    };
  }
}

export function useCurrentUser() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (!user) {
        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(user);

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        const userData = userSnap.exists() ? userSnap.data() : null;

        if (!userData) {
          setProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email || "Usuario",
            photoURL: user.photoURL,
            role: null,
            activo: true,
            estado: null,
            sellerId: null,
            distributorId: null,
            mercaderistaId: null,
            assignedName: null,
            assignedPhotoURL: null,
          });

          setLoading(false);
          return;
        }

        const assignedProfile = await getAssignedProfile(userData);

        const displayName =
          getTextValue(
            userData.displayName,
            userData.name,
            userData.nombre,
            userData.fullName,
            assignedProfile.assignedName,
            user.displayName,
            user.email
          ) || "Usuario";

        const photoURL = getTextValue(
          userData.photo?.url,
          userData.photoURL,
          user.photoURL,
          assignedProfile.assignedPhotoURL
        );

        setProfile({
          uid: user.uid,
          email: getTextValue(user.email, userData.email),
          displayName,
          photoURL,
          role: getTextValue(userData.role),
          activo: userData.activo ?? true,
          estado: getTextValue(userData.estado),
          sellerId: getTextValue(userData.sellerId),
          distributorId: getTextValue(userData.distributorId),
          mercaderistaId: getTextValue(userData.mercaderistaId),
          assignedName: assignedProfile.assignedName,
          assignedPhotoURL: assignedProfile.assignedPhotoURL,
        });
      } catch (error) {
        console.error("Error cargando perfil del usuario:", error);

        setProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email || "Usuario",
          photoURL: user.photoURL,
          role: null,
          activo: true,
          estado: null,
          sellerId: null,
          distributorId: null,
          mercaderistaId: null,
          assignedName: null,
          assignedPhotoURL: null,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    firebaseUser,
    profile,
    loading,
  };
}