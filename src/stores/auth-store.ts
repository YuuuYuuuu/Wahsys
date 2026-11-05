import { create } from "zustand";
import type { OrgRole, Role, StaffUnit } from "@prisma/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgRole: OrgRole | null;
  unit: StaffUnit | null;
  supervisorId: string | null;
};

type State = {
  accessToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
};

export const useAuthStore = create<State>((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clear: () => set({ accessToken: null, user: null }),
  setHydrated: (v) => set({ hydrated: v }),
}));
