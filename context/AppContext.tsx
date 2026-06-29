import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  User,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { firebaseAuth, firestore } from "@/services/firebase";
import type { ApplicationRecord, UserProfile } from "@/types";
import { createId } from "@/utils/profile";

type AppContextValue = {
  authUser: User | null;
  profile: UserProfile | null;
  applications: ApplicationRecord[];
  loading: boolean;
  error: string | null;
  isPremium: boolean;
  applicationsRemaining: number;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCareerProfile: (patch: Partial<UserProfile>) => Promise<void>;
  saveResumeText: (resumeText: string) => Promise<void>;
  applyResumeData: (patch: Partial<UserProfile>) => Promise<void>;
  recordApplication: (record: Omit<ApplicationRecord, "id" | "createdAt" | "status">) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  location: string;
  targetRole: string;
  experience: string;
  skills: string[];
};

const FREE_APPLICATION_LIMIT = 10;
const AppContext = createContext<AppContextValue | null>(null);

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultProfile(user: User, input?: Partial<UserProfile>): UserProfile {
  const now = new Date().toISOString();
  return {
    uid: user.uid,
    name: input?.name || user.displayName || "",
    email: user.email || input?.email || "",
    phone: input?.phone || "",
    location: input?.location || "",
    targetRole: input?.targetRole || "",
    experience: input?.experience || "",
    skills: input?.skills?.length ? input.skills : [],
    resumeText: input?.resumeText || "",
    resumeFileName: input?.resumeFileName || "",
    education: input?.education || [],
    photoUrl: input?.photoUrl || "",
    plan: input?.plan || "free",
    applyMonthKey: input?.applyMonthKey || currentMonthKey(),
    applyMonthCount: input?.applyMonthCount || 0,
    createdAt: input?.createdAt || now,
    updatedAt: now,
  };
}

function normalizeProfile(raw: any, user: User): UserProfile {
  const base = defaultProfile(user);
  const storedMonthKey = typeof raw?.applyMonthKey === "string" ? raw.applyMonthKey : base.applyMonthKey;
  const thisMonth = currentMonthKey();
  const applyMonthKey = storedMonthKey;
  const applyMonthCount = storedMonthKey === thisMonth ? (typeof raw?.applyMonthCount === "number" ? raw.applyMonthCount : 0) : 0;
  return {
    ...base,
    ...raw,
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : base.name,
    targetRole: typeof raw?.targetRole === "string" ? raw.targetRole : base.targetRole,
    experience: typeof raw?.experience === "string" ? raw.experience : base.experience,
    skills: Array.isArray(raw?.skills) ? raw.skills.filter((s: any) => typeof s === "string" && s.trim()) : base.skills,
    education: Array.isArray(raw?.education) ? raw.education : base.education,
    resumeFileName: typeof raw?.resumeFileName === "string" ? raw.resumeFileName : base.resumeFileName,
    photoUrl: typeof raw?.photoUrl === "string" ? raw.photoUrl : base.photoUrl,
    applyMonthKey,
    applyMonthCount,
  };
}

async function localKey(uid: string, suffix: string) {
  return `career-navigator:${uid}:${suffix}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrateForUser = async (user: User | null) => {
    setAuthUser(user);
    setError(null);
    if (!user) {
      setProfile(null);
      setApplications([]);
      setLoading(false);
      return;
    }
    try {
      const snap = await getDoc(doc(firestore, "profiles", user.uid));
      const data = snap.exists() ? normalizeProfile(snap.data(), user) : defaultProfile(user);
      if (!snap.exists()) await setDoc(doc(firestore, "profiles", user.uid), data, { merge: true });
      else if (data.applyMonthCount !== (snap.data()?.applyMonthCount || 0) || data.applyMonthKey !== (snap.data()?.applyMonthKey || "")) {
        await setDoc(doc(firestore, "profiles", user.uid), { applyMonthKey: data.applyMonthKey, applyMonthCount: data.applyMonthCount }, { merge: true });
      }
      setProfile(data);
      const appsRaw = await AsyncStorage.getItem(await localKey(user.uid, "applications"));
      setApplications(appsRaw ? JSON.parse(appsRaw) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setLoading(true);
      hydrateForUser(user).catch(() => setLoading(false));
    });
    return unsubscribe;
  }, []);

  const persistProfile = async (next: UserProfile) => {
    setProfile(next);
    await setDoc(doc(firestore, "profiles", next.uid), next, { merge: true });
  };

  const value = useMemo<AppContextValue>(() => {
    const isPremium = profile?.plan === "premium";
    const thisMonth = currentMonthKey();
    const monthCount = profile?.applyMonthKey === thisMonth ? (profile?.applyMonthCount || 0) : 0;
    return {
      authUser,
      profile,
      applications,
      loading,
      error,
      isPremium,
      applicationsRemaining: isPremium ? 9999 : Math.max(0, FREE_APPLICATION_LIMIT - monthCount),
      signIn: async (email, password) => {
        setError(null);
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      },
      register: async (input) => {
        setError(null);
        const credential = await createUserWithEmailAndPassword(firebaseAuth, input.email.trim(), input.password);
        await updateProfile(credential.user, { displayName: input.name.trim() });
        const next = defaultProfile(credential.user, input);
        await setDoc(doc(firestore, "profiles", credential.user.uid), next, { merge: true });
        setProfile(next);
      },
      signInWithGoogleToken: async (idToken) => {
        setError(null);
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(firebaseAuth, credential);
      },
      logout: async () => {
        await signOut(firebaseAuth);
      },
      updateCareerProfile: async (patch) => {
        if (!profile) return;
        const next: UserProfile = { ...profile, ...patch, updatedAt: new Date().toISOString() };
        if ("photoUrl" in patch) {
          next.photoUrl = typeof patch.photoUrl === "string" ? patch.photoUrl : profile.photoUrl;
        }
        await persistProfile(next);
      },
      saveResumeText: async (resumeText) => {
        if (!profile) return;
        await persistProfile({ ...profile, resumeText, updatedAt: new Date().toISOString() });
      },
      applyResumeData: async (patch) => {
        if (!profile) return;
        const merged: UserProfile = {
          ...profile,
          name: patch.name && patch.name.trim().length >= 2 ? patch.name.trim() : profile.name,
          phone: patch.phone && patch.phone.trim() ? patch.phone.trim() : profile.phone,
          location: patch.location && patch.location.trim() ? patch.location.trim() : profile.location,
          targetRole: patch.targetRole && patch.targetRole.trim() ? patch.targetRole.trim() : profile.targetRole,
          email: profile.email,
          skills: Array.from(new Set([...(patch.skills || []), ...profile.skills])).slice(0, 25),
          education: patch.education && patch.education.length ? patch.education : profile.education,
          experience: patch.experience && patch.experience.trim() ? patch.experience.trim() : profile.experience,
          resumeText: patch.resumeText || profile.resumeText,
          resumeFileName: patch.resumeFileName || profile.resumeFileName,
          photoUrl: profile.photoUrl,
          updatedAt: new Date().toISOString(),
        };
        await persistProfile(merged);
      },
      recordApplication: async (record) => {
        if (!profile) return;
        const thisMonth = currentMonthKey();
        const currentCount = profile.applyMonthKey === thisMonth ? (profile.applyMonthCount || 0) : 0;
        const updatedProfile: UserProfile = {
          ...profile,
          applyMonthKey: thisMonth,
          applyMonthCount: currentCount + 1,
          updatedAt: new Date().toISOString(),
        };
        await persistProfile(updatedProfile);
        const next: ApplicationRecord[] = [
          { ...record, id: createId(), status: "applied", createdAt: new Date().toISOString() },
          ...applications,
        ];
        setApplications(next);
        await AsyncStorage.setItem(await localKey(profile.uid, "applications"), JSON.stringify(next));
      },
      refreshProfile: async () => hydrateForUser(authUser),
    };
  }, [authUser, profile, applications, loading, error]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
