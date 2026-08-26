"use server";

import { revalidatePath } from "next/cache";
import { generateCalendar, regeneratePlatform } from "@/lib/social/agent";
import { gatherResearch, parseHandles } from "@/lib/social/insights";
import { store } from "@/lib/social/storage";
import { PLATFORMS, isProductionStage, type Platform } from "@/lib/social/types";

/**
 * SECURITY: these Server Actions are reachable by direct POST and currently
 * have no authentication. Add an auth check at the top of every action below
 * before this is deployed anywhere reachable from the internet.
 */

export async function toggleProduction(formData: FormData) {
  const monthId = String(formData.get("monthId"));
  const itemId = String(formData.get("itemId"));
  const stage = String(formData.get("stage"));
  const value = formData.get("value") === "true";

  if (!isProductionStage(stage)) throw new Error(`Unknown stage: ${stage}`);

  await store.setProduction(monthId, itemId, stage, value);
  revalidatePath("/studio");
}

export async function saveLiveLink(formData: FormData) {
  const monthId = String(formData.get("monthId"));
  const itemId = String(formData.get("itemId"));
  const link = String(formData.get("link") ?? "");

  await store.setLiveLink(monthId, itemId, link);
  revalidatePath("/studio");
}

export interface GenerateState {
  error?: string;
  ok?: boolean;
}

export async function generateMonth(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const brief = String(formData.get("brief") ?? "").trim();

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return { error: "Pick a valid year and month." };
  }

  // One set of handles + notes per platform, named `<platform>Own` etc.
  const inputs = PLATFORMS.map((platform) => researchInput(formData, platform));

  // Best-effort: research must never block the month from being planned.
  let research: Awaited<ReturnType<typeof gatherResearch>> = {};
  try {
    research = await gatherResearch(inputs);
  } catch (err) {
    console.error("Research gathering failed, planning without it:", err);
  }

  try {
    const calendar = await generateCalendar({
      year,
      month,
      brief: brief || undefined,
      research,
    });
    await store.save(calendar);
    revalidatePath("/studio");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Generation failed." };
  }
}

/** Reads the research fields for one platform out of the form. */
function researchInput(formData: FormData, platform: Platform) {
  return {
    platform,
    ownHandle: String(formData.get(`${platform}Own`) ?? "").trim(),
    competitors: parseHandles(String(formData.get(`${platform}Competitors`) ?? "")),
    notes: String(formData.get(`${platform}Notes`) ?? "").trim(),
  };
}

/**
 * Re-plans a single platform inside an existing month. The other two platforms
 * keep their content and their ticked boxes.
 */
export async function replanPlatform(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const raw = String(formData.get("platform") ?? "");
  const brief = String(formData.get("brief") ?? "").trim();

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return { error: "Pick a valid year and month." };
  }
  if (!PLATFORMS.includes(raw as Platform)) {
    return { error: `Unknown platform: ${raw}` };
  }
  const platform = raw as Platform;

  const id = `${year}-${String(month).padStart(2, "0")}`;
  const calendar = await store.get(id);
  if (!calendar) {
    return {
      error: "This month has not been planned yet — plan the full month first.",
    };
  }

  // Best-effort: research must never block the re-plan.
  let research: Awaited<ReturnType<typeof gatherResearch>> = {};
  try {
    research = await gatherResearch([researchInput(formData, platform)]);
  } catch (err) {
    console.error("Research gathering failed, planning without it:", err);
  }

  try {
    const next = await regeneratePlatform(calendar, platform, {
      brief: brief || undefined,
      research,
    });
    await store.save(next);
    revalidatePath("/studio");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Re-plan failed." };
  }
}
