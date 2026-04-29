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
import type { ApplicationRecord, ResumeData, UserProfile } from "@/types";
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
  analysesRemaining: number;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCareerProfile: (patch: Partial<UserProfile>) => Promise<void>;
  saveResumeText: (resumeText: string) => Promise<void>;
  saveResumeData: (resumeData: ResumeData, hash: string) => Promise<void>;
  recordAnalysis: () => Promise<boolean>;
  upgradePlan: () => Promise<void>;
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
const FREE_AI_LIMIT = 2;
const FREE_ANALYSIS_LIMIT = 3;
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
    skills: input?.skills?.length ? input.skills : ["JavaScript", "React Native", "Communication"],
    resumeText: input?.resumeText || "",
    plan: input?.plan || "free",
    analysesUsedToday: input?.analysesUsedToday ?? 0,
    analysesDate: input?.analysesDate || now.slice(0, 10),
    createdAt: input?.createdAt || now,
    updatedAt: now,
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
      const data = snap.exists() ? (snap.data() as UserProfile) : defaultProfile(user);
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
      analysesRemaining: isPremium ? 999 : Math.max(0, FREE_ANALYSIS_LIMIT - (profile?.analysesUsedToday ?? 0)),
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
      saveResumeData: async (resumeData, hash) => {
        if (!profile) return;
        await persistProfile({ ...profile, resumeData, resumeHash: hash, updatedAt: new Date().toISOString() });
      },
      recordAnalysis: async () => {
        if (!profile) return false;
        if (isPremium) return true;
        const today = new Date().toISOString().slice(0, 10);
        const used = profile.analysesDate === today ? (profile.analysesUsedToday ?? 0) : 0;
        if (used >= FREE_ANALYSIS_LIMIT) return false;
        await persistProfile({ ...profile, analysesUsedToday: used + 1, analysesDate: today, updatedAt: new Date().toISOString() });
        return true;
      },
      upgradePlan: async () => {
        if (!profile) return;
        await persistProfile({ ...profile, plan: "premium", updatedAt: new Date().toISOString() });
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
      startAiSession: async () => {
        if (isPremium || aiSessionsUsed < FREE_AI_LIMIT) {
          const next = aiSessionsUsed + 1;
          setAiSessionsUsed(next);
          if (profile) await AsyncStorage.setItem(await localKey(profile.uid, "aiSessions"), String(next));
          return true;
        }
        return false;
      },
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
