/**
 * Auth group layout — no header, no bottom nav.
 * Stack navigator for welcome → phone-email → otp flow.
 */
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="phone-email" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
