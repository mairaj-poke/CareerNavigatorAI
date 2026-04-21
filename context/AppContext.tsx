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
  aiSessionsRemaining: number;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCareerProfile: (patch: Partial<UserProfile>) => Promise<void>;
  saveResumeText: (resumeText: string) => Promise<void>;
  applyResumeData: (patch: Partial<UserProfile>) => Promise<void>;
  recordApplication: (record: Omit<ApplicationRecord, "id" | "createdAt" | "status">) => Promise<void>;
  startAiSession: () => Promise<boolean>;
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
const FREE_AI_LIMIT = 999;
const AppContext = createContext<AppContextValue | null>(null);

function defaultProfile(user: User, input?: Partial<UserProfile>): UserProfile {
  const now = new Date().toISOString();
  return {
    uid: user.uid,
    name: input?.name || user.displayName || "Career Seeker",
    email: user.email || input?.email || "",
    phone: input?.phone || "",
    location: input?.location || "India",
    targetRole: input?.targetRole || "Software Developer",
    experience: input?.experience || "0-2 years",
    skills: input?.skills?.length ? input.skills : ["Communication", "Problem Solving", "Teamwork"],
    resumeText: input?.resumeText || "",
    resumeFileName: input?.resumeFileName || "",
    education: input?.education || [],
    photoUrl: input?.photoUrl || "",
    plan: input?.plan || "free",
    createdAt: input?.createdAt || now,
    updatedAt: now,
  };
}

function normalizeProfile(raw: any, user: User): UserProfile {
  const base = defaultProfile(user);
  return {
    ...base,
    ...raw,
    skills: Array.isArray(raw?.skills) ? raw.skills.filter((skill: any) => typeof skill === "string") : base.skills,
    education: Array.isArray(raw?.education) ? raw.education : base.education,
    resumeFileName: typeof raw?.resumeFileName === "string" ? raw.resumeFileName : base.resumeFileName,
    photoUrl: typeof raw?.photoUrl === "string" ? raw.photoUrl : base.photoUrl,
  };
}

async function localKey(uid: string, suffix: string) {
  return `career-navigator:${uid}:${suffix}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [aiSessionsUsed, setAiSessionsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrateForUser = async (user: User | null) => {
    setAuthUser(user);
    setError(null);
    if (!user) {
      setProfile(null);
      setApplications([]);
      setAiSessionsUsed(0);
      setLoading(false);
      return;
    }
    try {
      const snap = await getDoc(doc(firestore, "profiles", user.uid));
      const data = snap.exists() ? normalizeProfile(snap.data(), user) : defaultProfile(user);
      if (!snap.exists()) await setDoc(doc(firestore, "profiles", user.uid), data, { merge: true });
      setProfile(data);
      const appsRaw = await AsyncStorage.getItem(await localKey(user.uid, "applications"));
      setApplications(appsRaw ? JSON.parse(appsRaw) : []);
      const aiRaw = await AsyncStorage.getItem(await localKey(user.uid, "aiSessions"));
      setAiSessionsUsed(aiRaw ? Number(aiRaw) || 0 : 0);
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
    return {
      authUser,
      profile,
      applications,
      loading,
      error,
      isPremium,
      applicationsRemaining: isPremium ? 999 : Math.max(0, FREE_APPLICATION_LIMIT - applications.length),
      aiSessionsRemaining: isPremium ? 999 : Math.max(0, FREE_AI_LIMIT - aiSessionsUsed),
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
        await persistProfile({ ...profile, ...patch, updatedAt: new Date().toISOString() });
      },
      saveResumeText: async (resumeText) => {
        if (!profile) return;
        await persistProfile({ ...profile, resumeText, updatedAt: new Date().toISOString() });
      },
      applyResumeData: async (patch) => {
        if (!profile) return;
        const merged: UserProfile = {
          ...profile,
          ...patch,
          name: patch.name && patch.name.trim().length >= 2 ? patch.name.trim() : profile.name,
          phone: patch.phone && patch.phone.trim() ? patch.phone.trim() : profile.phone,
          email: profile.email,
          skills: Array.from(new Set([...(patch.skills || []), ...profile.skills])).slice(0, 20),
          education: patch.education && patch.education.length ? patch.education : profile.education,
          experience: patch.experience && patch.experience.trim() ? patch.experience.trim() : profile.experience,
          resumeText: patch.resumeText || profile.resumeText,
          resumeFileName: patch.resumeFileName || profile.resumeFileName,
          updatedAt: new Date().toISOString(),
        };
        await persistProfile(merged);
      },
      recordApplication: async (record) => {
        if (!profile) return;
        const next: ApplicationRecord[] = [
          { ...record, id: createId(), status: "applied", createdAt: new Date().toISOString() },
          ...applications,
        ];
        setApplications(next);
        await AsyncStorage.setItem(await localKey(profile.uid, "applications"), JSON.stringify(next));
      },
      startAiSession: async () => true,
      refreshProfile: async () => hydrateForUser(authUser),
    };
  }, [authUser, profile, applications, loading, error, aiSessionsUsed]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
