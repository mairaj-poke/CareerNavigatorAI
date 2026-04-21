import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { ResumeEducation } from "@/types";

export type ParsedResume = {
  fileName: string;
  text: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  education: ResumeEducation[];
  experience: string;
};

function getApiBase() {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

async function fileToBase64(uri: string, file?: File | null) {
  if (Platform.OS === "web") {
    const target = file || (await fetch(uri).then((response) => response.blob()));
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error || new Error("Could not read file."));
      reader.readAsDataURL(target as Blob);
    });
  }
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function parseResumeFile(uri: string, fileName: string, mimeType: string, file?: File | null): Promise<ParsedResume> {
  const base = getApiBase();
  if (!base) throw new Error("Set EXPO_PUBLIC_API_BASE_URL to your backend URL to enable resume parsing.");
  const fileBase64 = await fileToBase64(uri, file);
  if (!fileBase64) throw new Error("Could not read the selected file.");
  const response = await fetch(`${base}/api/parse-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileBase64, fileName, mimeType }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text ? text.slice(0, 200) : "Resume parsing service is unavailable right now.");
  }
  return (await response.json()) as ParsedResume;
}
