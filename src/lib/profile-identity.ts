export const trainerSettingsStorageKey = "aurelian-trainer-settings";
export const profileUpdatedEventName = "app-profile-updated";

export type DemoTrainerSettings = {
  name: string;
  email: string;
  bio: string;
  photo: string;
};

export const defaultDemoTrainerSettings: DemoTrainerSettings = {
  name: "Nick Glushien",
  email: "trainer@example.com",
  bio: "Calm, precise strength training for busy clients who want durable progress.",
  photo: "",
};

export function readDemoTrainerSettings() {
  const stored = window.localStorage.getItem(trainerSettingsStorageKey);
  if (!stored) return defaultDemoTrainerSettings;

  try {
    return {
      ...defaultDemoTrainerSettings,
      ...(JSON.parse(stored) as Partial<DemoTrainerSettings>),
    };
  } catch {
    window.localStorage.removeItem(trainerSettingsStorageKey);
    return defaultDemoTrainerSettings;
  }
}

export function writeDemoTrainerSettings(settings: DemoTrainerSettings) {
  window.localStorage.setItem(trainerSettingsStorageKey, JSON.stringify(settings));
}

export async function readImageFileAsDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Please choose an image under 2MB.");
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

export function dispatchProfileUpdated() {
  window.dispatchEvent(new Event(profileUpdatedEventName));
}
