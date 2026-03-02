# Career Navigator AI — APK Build Guide

## What You've Got

A complete React Native (Expo) app with:
- ✅ Real AI job search via Claude + web search
- ✅ Resume upload & AI analysis
- ✅ Match scores, skill gap analysis
- ✅ 13-industry dropdown, 6 work types (Remote, On-site, Hybrid, Internship, Contract, Part-time)
- ✅ Min-match score filter with preset buttons
- ✅ Saved jobs section with badge counter
- ✅ Apply Now → opens real official job URLs
- ✅ Back navigation on every screen
- ✅ No dummy data — everything from AI + resume

---

## Step 1 — Install Prerequisites (one-time setup)

### A. Install Node.js
Go to https://nodejs.org and download the **LTS version** (v20 or later).

### B. Install Expo CLI + EAS CLI
Open your terminal or command prompt and run:
```bash
npm install -g expo-cli eas-cli
```

### C. Create a free Expo account
Go to https://expo.dev and sign up for a free account.

---

## Step 2 — Set Up the Project

1. Extract the `CareerNavigatorAI` folder to your Desktop or any folder.

2. Open terminal in that folder and install dependencies:
```bash
cd CareerNavigatorAI
npm install
```

3. Log in to Expo:
```bash
eas login
```
Enter your Expo email and password.

---

## Step 3 — Configure Your Project

Run this to link your project to Expo:
```bash
eas init
```

This will:
- Ask you to confirm the project name ("Career Navigator AI")
- Generate a `projectId` in your `app.json` automatically

---

## Step 4 — Build the APK

Run this single command to build a shareable APK:
```bash
eas build -p android --profile preview
```

What happens:
- EAS cloud builds the APK on Expo's servers (no Android Studio needed)
- Takes about **8–15 minutes**
- When done, it prints a **download URL** for the `.apk` file

You can monitor the build at: https://expo.dev/accounts/[your-username]/projects/career-navigator-ai/builds

---

## Step 5 — Download & Share the APK

1. Click the download link from the terminal or Expo dashboard
2. The file is named something like `career-navigator-ai-preview.apk`
3. **Share it with friends via:**
   - WhatsApp / Telegram (send the APK file directly)
   - Google Drive or Dropbox link
   - AirDrop (Android to Android)
   - Email attachment

---

## Step 6 — Install on Android

Tell your friends to:
1. Open **Settings** → **Security** (or **Apps**)
2. Enable **"Install from unknown sources"** or **"Install unknown apps"**
3. Open the APK file → tap **Install**
4. Done! The app appears on their home screen as **"Career Navigator AI"**

> **iPhone Note:** APK files only work on Android. For iPhone testers, use TestFlight or share the web version instead.

---

## Step 7 — Test the App

When you open the app, here's what to test:

### Onboarding
- Fill in your name, email, location, role
- Upload a PDF/DOCX resume
- Check that skills are extracted correctly

### My Matches Tab
- Jobs load from real sources (LinkedIn, Indeed, Greenhouse, etc.)
- Tap filter chips: Work Type, Industry, Level
- Try the Min Match buttons: 50%+, 70%+, 80%+, 90%+
- Tap a job card → tap "Details" to open full modal
- Tap "Apply Now" → opens the actual job page in browser

### Saved Jobs Tab
- Tap ☆ star on any job → check it appears in Saved tab
- Badge counter updates on the tab bar

### Resume Tab
- Shows your extracted skills, tools, certifications
- ATS score, readability, keyword match scores

### Skill Gap Tab
- Shows missing skills across your job matches
- Each gap shows importance level and learning resources

### Analytics Tab
- Industry score breakdown
- Match trend chart
- Application tracker

### Settings Tab
- Upload a new resume to replace the current one
- Log out returns to onboarding

---

## Feedback Collection Tips

When sharing with testers, ask them:
1. Did the job search return relevant results for their role?
2. Was the resume upload easy?
3. Do the match scores feel accurate?
4. Are there any crashes or slow screens?
5. What's missing that they'd want?

---

## Updating the App

After making changes to the code, rebuild with:
```bash
eas build -p android --profile preview
```

Each build gets a new download URL. Share the new link with testers.

---

## Quick Commands Reference

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies |
| `expo start` | Run in Expo Go app (for quick testing) |
| `eas build -p android --profile preview` | Build shareable APK |
| `eas build -p android --profile production` | Build production AAB for Play Store |

---

## Troubleshooting

**"eas: command not found"**
→ Run: `npm install -g eas-cli` again

**Build fails with "projectId not found"**
→ Run: `eas init` to link the project

**App crashes on launch**
→ Run `expo start` first and test in Expo Go to see error logs

**Jobs not loading**
→ Check your internet connection. The app uses Claude API for real job search.

**Resume upload not working**
→ Try a plain text (.txt) or simpler PDF. Some complex PDF layouts may not extract well.

---

## File Structure

```
CareerNavigatorAI/
├── App.js                    ← Main entry + navigation
├── app.json                  ← Expo config
├── eas.json                  ← Build config (APK settings here)
├── package.json
├── src/
│   ├── api/
│   │   └── claude.js         ← All AI API calls
│   ├── components/
│   │   ├── index.js          ← Shared UI components
│   │   └── JobCard.js        ← Job card + detail modal
│   ├── screens/
│   │   ├── OnboardingScreen.js
│   │   ├── MatchesScreen.js  ← Main search + filters
│   │   └── OtherScreens.js   ← Saved, Resume, Skills, Analytics, Settings
│   ├── theme/
│   │   └── index.js          ← Colors, typography, spacing
│   └── utils/
│       └── constants.js      ← Industries, work types, etc.
└── assets/                   ← App icons + splash screen
```
