import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '';

export function configureRevenueCat(): void {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!apiKey) {
    console.warn('[revenuecat] Missing API key — set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / ANDROID_API_KEY');
    return;
  }
  try {
    Purchases.configure({ apiKey });
  } catch (err) {
    console.warn('[revenuecat] configure failed (expected in Expo Go):', err);
  }
}

export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.error('[revenuecat] getCustomerInfo error:', err);
    return null;
  }
}

export async function purchasePackage(
  pkg: import('react-native-purchases').PurchasesPackage
) {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}
