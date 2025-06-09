import { browser } from "@/index";
import { onboarding } from "@/onboarding/main";
import { SettingsDataStore } from "@/saving/settings";
import { app } from "electron";

const ONBOARDING_KEY = "onboarding_version_completed";
const ONBOARDING_VERSION = "v1";

export async function hasCompletedOnboarding() {
  const onboardingData = await SettingsDataStore.get<string>(ONBOARDING_KEY);
  return onboardingData === ONBOARDING_VERSION;
}

export async function setOnboardingCompleted() {
  await SettingsDataStore.set(ONBOARDING_KEY, ONBOARDING_VERSION);
  onboarding.hide();

  if (browser?.getWindows().length === 0) {
    // Create a new window and load avax.network
    const window = await browser?.createWindow();
    if (window) {
      // Create a new tab with avax.network
      const tab = await browser.tabs.createTab(window.id);
      tab.loadURL("https://avax.network");
      browser.tabs.setActiveTab(tab);
      window.window.focus();
    }
  }
}

export async function resetOnboarding() {
  await SettingsDataStore.remove(ONBOARDING_KEY);
  app.quit();
}
