import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import CustomTabBar from '@/components/CustomTabBar';

export default function TabLayout() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const access = user?.tabAccess ?? [];

  const canSee = (tabId: string) => isDirector || access.includes(tabId);
  const hrefOrNull = (canAccess: boolean) => canAccess ? undefined : null;

  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trucks"
        options={{
          title: 'Trucks',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'car' : 'car-outline'} size={size} color={color} />
          ),
          href: hrefOrNull(canSee('my-trucks')),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
          ),
          href: hrefOrNull(canSee('daily-ops') || canSee('trips')),
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Drivers',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
          href: hrefOrNull(canSee('drivers')),
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Avail.',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={size} color={color} />
          ),
          href: hrefOrNull(user?.role === 'MANAGER' && canSee('availability')),
        }}
      />
      <Tabs.Screen
        name="assignment"
        options={{
          title: 'Assign',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'git-branch' : 'git-branch-outline'} size={size} color={color} />
          ),
          href: hrefOrNull(user?.role === 'MANAGER' && canSee('assignments')),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
