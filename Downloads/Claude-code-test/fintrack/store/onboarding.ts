/**
 * Onboarding state machine — Zustand store.
 * Tracks progress through the 5-screen onboarding flow.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMethod = 'google' | 'apple' | 'phone' | 'email' | null;
export type OnboardingStep = 'welcome' | 'otp' | 'name-dob' | 'connect-bank' | 'dashboard';

interface OnboardingState {
  authMethod: AuthMethod;
  phoneOrEmail: string;
  displayName: string;
  dateOfBirth: Date | null;
  baseCurrency: string;
  bankConnected: boolean;
  bankName: string | null;
  isFirstLanding: boolean;
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

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'fintrack-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        authMethod: state.authMethod,
        phoneOrEmail: state.phoneOrEmail,
        displayName: state.displayName,
        baseCurrency: state.baseCurrency,
        bankConnected: state.bankConnected,
        bankName: state.bankName,
        isFirstLanding: state.isFirstLanding,
        // dateOfBirth excluded — Date objects don't serialize cleanly to JSON;
        // the profile is persisted in Supabase after createUserProfile() succeeds
      }),
    }
  )
);
