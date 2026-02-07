import { supabase, User } from "./supabase";

const STORAGE_KEY = "vertex_user";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setStoredUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function loginWithPhone(phone: string): Promise<{ user?: User; error?: string }> {
  // Buscar usuario existente o crear uno nuevo
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (existing) {
    setStoredUser(existing);
    return { user: existing };
  }

  // Crear nuevo usuario (sin OTP por ahora, simplificado para demo)
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({ phone, display_name: phone })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  setStoredUser(newUser);
  return { user: newUser };
}
