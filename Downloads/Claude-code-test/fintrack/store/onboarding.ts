/**
 * Onboarding + Finance Settings state machine — Zustand store.
 * Tracks progress through the 5-screen onboarding flow and persists
 * user-configured financial targets (income, budget split).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMethod = 'google' | 'apple' | 'phone' | 'email' | null;
export type OnboardingStep = 'welcome' | 'otp' | 'name-dob' | 'connect-bank' | 'dashboard';

interface OnboardingState {
  // ── Auth / Profile ──────────────────────────────────────────────────────────
  authMethod: AuthMethod;
  phoneOrEmail: string;
  displayName: string;
  dateOfBirth: Date | null;
  baseCurrency: string;
  bankConnected: boolean;
  bankName: string | null;
  isFirstLanding: boolean;

  // ── Finance Settings (US-028) ───────────────────────────────────────────────
  /** Monthly take-home income in smallest currency unit (paise/cents/pence). 0 = not set. */
  monthlyIncome: number;
  /** Budget target: percentage allocated to Needs (0–100). Default 50. */
  budgetNeedsPct: number;
  /** Budget target: percentage allocated to Wants (0–100). Default 30. */
  budgetWantsPct: number;
  /** Budget target: percentage allocated to Savings (0–100). Default 20. */
  budgetSavingsPct: number;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setAuthMethod: (method: AuthMethod) => void;
  setPhoneOrEmail: (value: string) => void;
  setDisplayName: (name: string) => void;
  setDateOfBirth: (dob: Date) => void;
  setBaseCurrency: (currency: string) => void;
  setBankConnected: (connected: boolean, bankName?: string) => void;
  markFirstLandingSeen: () => void;
  setMonthlyIncome: (amount: number) => void;
  setBudgetTargets: (needs: number, wants: number, savings: number) => void;
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
  monthlyIncome: 0,
  budgetNeedsPct: 50,
  budgetWantsPct: 30,
  budgetSavingsPct: 20,
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
      setMonthlyIncome: (amount) => set({ monthlyIncome: amount }),
      setBudgetTargets: (needs, wants, savings) =>
        set({ budgetNeedsPct: needs, budgetWantsPct: wants, budgetSavingsPct: savings }),
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
        monthlyIncome: state.monthlyIncome,
        budgetNeedsPct: state.budgetNeedsPct,
        budgetWantsPct: state.budgetWantsPct,
        budgetSavingsPct: state.budgetSavingsPct,
        // dateOfBirth excluded — Date objects don't serialize cleanly to JSON;
        // the profile is persisted in Supabase after createUserProfile() succeeds
      }),
    }
  )
);
