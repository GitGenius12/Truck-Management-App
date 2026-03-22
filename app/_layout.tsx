import { useEffect } from 'react';
import { View } from 'react-native';
import OmLoader from '@/components/OmLoader';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { OneSignal } from 'react-native-onesignal';
import { ONESIGNAL_APP_ID } from '@/constants/config';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';

    console.log('[Nav] user:', user?.email, 'status:', user?.status, 'segments:', segments);

    if (!user) {
      if (!inAuth) {
        console.log('[Nav] → login (no user)');
        router.replace('/(auth)/login');
      }
      return;
    }

    if (user.status === 'REJECTED') {
      console.log('[Nav] → login (rejected)');
      router.replace('/(auth)/login');
      return;
    }

    if (user.status === 'PENDING') {
      if (segments[1] !== 'pending-approval') {
        console.log('[Nav] → pending-approval');
        router.replace('/(auth)/pending-approval');
      }
      return;
    }

    // APPROVED
    if (!user.isProfileComplete && user.role !== 'DIRECTOR') {
      if (segments[1] !== 'complete-profile') {
        console.log('[Nav] → complete-profile');
        router.replace('/(auth)/complete-profile');
      }
      return;
    }

    if (inAuth) {
      console.log('[Nav] → tabs');
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryDark }}>
        <OmLoader fullScreen />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="trucks/add"
        options={{ presentation: 'modal', headerShown: true, title: 'Add Truck', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="trucks/[id]"
        options={{ headerShown: true, title: 'Truck Details', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="trips/add"
        options={{ presentation: 'modal', headerShown: true, title: 'Add Trip', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="drivers/[id]"
        options={{ headerShown: true, title: 'Driver Details', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/average"
        options={{ headerShown: true, title: 'Average / Mileage', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/validity"
        options={{ headerShown: true, title: 'Validity', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/approvals"
        options={{ headerShown: true, title: 'Approvals', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/users"
        options={{ headerShown: true, title: 'All Users', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/transactions"
        options={{ headerShown: true, title: 'Transactions', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/bank-entry"
        options={{ headerShown: true, title: 'Bank Entry', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/availability"
        options={{ headerShown: true, title: 'Availability', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/assignment"
        options={{ headerShown: true, title: 'Assignment', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/misc-spend"
        options={{ headerShown: true, title: 'Misc Spend', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/accesses"
        options={{ headerShown: true, title: 'Accesses', headerTintColor: '#145854' }}
      />
      <Stack.Screen
        name="more/profile"
        options={{ headerShown: true, title: 'My Profile', headerTintColor: '#145854' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);

    const handleNotificationClick = (event: any) => {
      const data = event?.notification?.additionalData as Record<string, string> | undefined;
      if (!data?.type) return;

      switch (data.type) {
        case 'approval_request':
        case 'approved':
        case 'rejected':
          router.push('/more/approvals');
          break;
        case 'assignment_created':
        case 'assignment_removed':
          router.push('/more/assignment');
          break;
        case 'trip_created':
        case 'trip_updated':
          router.push('/(tabs)/daily-ops' as any);
          break;
        case 'bank_entry':
        case 'bank_entry_updated':
          router.push('/more/bank-entry');
          break;
        case 'doc_expiry':
          router.push('/more/validity');
          break;
      }
    };

    OneSignal.Notifications.addEventListener('click', handleNotificationClick);
    return () => OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
  }, []);

  return (
    <AuthProvider>
      <RootNavigation />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
