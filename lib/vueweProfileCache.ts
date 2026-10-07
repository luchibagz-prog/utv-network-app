"use client";

import { supabase } from "./supabaseClient";

type VueweProfileRow = Record<string, any>;

const TTL_MS = 60_000;

const profileCache = new Map<
  string,
  { value: VueweProfileRow | null; expiresAt: number }
>();

const pendingProfiles = new Map<
  string,
  Promise<VueweProfileRow | null>
>();

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function primeVueweProfile(
  email: string,
  value: VueweProfileRow | null
) {
  const key = normalizeEmail(email);
  if (!key) return;

  profileCache.set(key, {
    value,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function invalidateVueweProfile(email: string) {
  const key = normalizeEmail(email);
  if (!key) return;
  profileCache.delete(key);
  pendingProfiles.delete(key);
}

export async function getVueweProfile(
  email: string,
  options?: { force?: boolean }
): Promise<VueweProfileRow | null> {
  const key = normalizeEmail(email);
  if (!key) return null;

  if (!options?.force) {
    const cached = profileCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const pending = pendingProfiles.get(key);
    if (pending) return pending;
  }

  const request = (async () => {
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    primeVueweProfile(key, data || null);
    return data || null;
  })();

  pendingProfiles.set(key, request);

  try {
    return await request;
  } finally {
    if (pendingProfiles.get(key) === request) {
      pendingProfiles.delete(key);
    }
  }
}
