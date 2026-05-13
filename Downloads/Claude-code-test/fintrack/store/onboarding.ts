/**
 * Onboarding state machine — Zustand store.
 * Tracks progress through the 5-screen onboarding flow.
 */
import { create } from 'zustand';

export type AuthMethod = 'google' | 'apple' | 'phone' | 'email' | null;
export type OnboardingStep = 'welcome' | 'otp' | 'name-dob' | 'connect-bank' | 'dashboard';

interface OnboardingState {
  // Auth
  authMethod: AuthMethod;
  phoneOrEmail: string;

  // Profile
  displayName: string;
  dateOfBirth: Date | null;
  baseCurrency: string;

  // Bank connection
  bankConnected: boolean;
  bankName: string | null;

  // Completion
  isFirstLanding: boolean;

  // Actions
  setAuthMethod: (method: AuthMethod) => void;
  setPhoneOrEmail: (value: string) => void;
  setDisplayName: (name: string) => void;
  setDateOfBirth: (dob: Date) => void;
  setBaseCurrency: (currency: string) => void;
  setBankConnected: (connected: boolean, bankName?: string) => void;
  markFirstLandingSeen: () => void;
  reset: () => void;
}

const initialState = {
  authMethod: null as AuthMethod,
  phoneOrEmail: '',
  displayName: '',
  dateOfBirth: null,
  baseCurrency: 'INR',
  bankConnected: false,
  bankName: null,
  isFirstLanding: true,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,

  setAuthMethod: (method) => set({ authMethod: method }),
  setPhoneOrEmail: (value) => set({ phoneOrEmail: value }),
  setDisplayName: (name) => set({ displayName: name }),
  setDateOfBirth: (dob) => set({ dateOfBirth: dob }),
  setBaseCurrency: (currency) => set({ baseCurrency: currency }),
  setBankConnected: (connected, bankName = undefined) =>
    set({ bankConnected: connected, bankName: bankName ?? null }),
  markFirstLandingSeen: () => set({ isFirstLanding: false }),
  reset: () => set(initialState),
}));
