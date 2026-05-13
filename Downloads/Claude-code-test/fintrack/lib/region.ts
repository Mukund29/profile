/**
 * Region detection — uses device locale to infer the user's country.
 * Drives which bank provider and currency are pre-selected at onboarding.
 */
import * as Localization from 'expo-localization';

export type Region = 'IN' | 'US' | 'UK' | 'OTHER';

/**
 * Detect region from the device's primary locale.
 * Falls back to 'OTHER' if the region code cannot be determined.
 */
export function detectRegion(): Region {
  const locale = Localization.getLocales()[0];
  // regionCode may be null on some Android versions; fall back to the BCP-47 tag.
  const region = locale?.regionCode ?? locale?.languageTag?.split('-')[1] ?? '';

  if (region === 'IN') return 'IN';
  if (region === 'US') return 'US';
  if (region === 'GB') return 'UK'; // ISO 3166-1 alpha-2 for United Kingdom
  return 'OTHER';
}

/**
 * Returns the ISO 4217 currency code for the detected region.
 * Users can override this at the onboarding name/DOB screen.
 */
export function getCurrencyForRegion(region: Region): string {
  const map: Record<Region, string> = {
    IN: 'INR',
    US: 'USD',
    UK: 'GBP',
    OTHER: 'USD',
  };
  return map[region];
}

/**
 * Returns the bank sync provider for the detected region.
 * Used to decide which connect-bank flow to present after onboarding.
 */
export function getBankProvider(
  region: Region
): 'setu_aa' | 'plaid' | 'truelayer' | 'manual' {
  const map: Record<Region, 'setu_aa' | 'plaid' | 'truelayer' | 'manual'> = {
    IN: 'setu_aa',
    US: 'plaid',
    UK: 'truelayer',
    OTHER: 'manual',
  };
  return map[region];
}

/**
 * Returns the BCP-47 locale string for the detected region,
 * suitable for storing in user_profiles.locale.
 */
export function getLocaleForRegion(region: Region): string {
  const map: Record<Region, string> = {
    IN: 'en-IN',
    US: 'en-US',
    UK: 'en-GB',
    OTHER: 'en-US',
  };
  return map[region];
}
