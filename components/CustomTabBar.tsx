import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Filter out tabs hidden via expo-router's href: null (sets tabBarButton to () => null)
  const visibleRoutes = state.routes.filter(route => {
    const opts = descriptors[route.key].options as any;
    if (typeof opts.tabBarButton === 'function') {
      try {
        if (opts.tabBarButton({ children: null }) === null) return false;
      } catch {
        return true;
      }
    }
    return true;
  });

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 21) }]}>
      <View style={styles.bar}>
        {visibleRoutes.map(route => {
          const { options } = descriptors[route.key];
          const isFocused = state.routes[state.index]?.key === route.key;
          const label = (options.title ?? route.name).toUpperCase();

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? '#FFFFFF' : '#AAAAAA',
            size: 18,
          });

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, isFocused && styles.tabActive]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              {icon}
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 21,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    height: 62,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 26,
  },
  tabActive: {
    backgroundColor: '#0D6E6E',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
