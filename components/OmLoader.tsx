import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';

interface OmLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function OmLoader({ text = 'Loading…', size = 'md', fullScreen = false }: OmLoaderProps) {
  const dim   = size === 'sm' ? 64  : size === 'lg' ? 120 : 90;
  const font  = size === 'sm' ? 32  : size === 'lg' ? 62  : 46;
  const ring1 = dim + 18;
  const ring2 = dim + 34;

  const outerRotate = useRef(new Animated.Value(0)).current;
  const innerRotate = useRef(new Animated.Value(0)).current;
  const omScale     = useRef(new Animated.Value(1)).current;
  const omOpacity   = useRef(new Animated.Value(1)).current;
  const dot1        = useRef(new Animated.Value(0)).current;
  const dot2        = useRef(new Animated.Value(0)).current;
  const dot3        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Outer ring — slow clockwise
    Animated.loop(
      Animated.timing(outerRotate, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Inner arc — fast counter-clockwise
    Animated.loop(
      Animated.timing(innerRotate, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    // Om pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(omScale,   { toValue: 1.1,  duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(omOpacity, { toValue: 0.82, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(omScale,   { toValue: 1,    duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(omOpacity, { toValue: 1,    duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Three staggered dots — mirrors the CSS om-dots keyframes
    const startDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 560, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 560, easing: Easing.ease, useNativeDriver: true }),
          Animated.delay(Math.max(0, 1400 - 1120 - delay)),
        ])
      ).start();
    };
    startDot(dot1, 0);
    startDot(dot2, 224);
    startDot(dot3, 448);

    return () => {
      outerRotate.stopAnimation();
      innerRotate.stopAnimation();
      omScale.stopAnimation();
      omOpacity.stopAnimation();
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, []);

  const outerSpin = outerRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const innerSpin = innerRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  const dotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
  });

  return (
    <View style={[styles.wrapper, fullScreen && styles.fullScreen]}>
      {/* Ring stack */}
      <View style={{ width: ring2, height: ring2, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer dashed slow ring */}
        <Animated.View style={[
          styles.outerRing,
          { width: ring2, height: ring2, borderRadius: ring2 / 2 },
          { transform: [{ rotate: outerSpin }] },
        ]} />

        {/* Inner arc fast counter-rotate */}
        <Animated.View style={[
          styles.innerArc,
          { width: ring1, height: ring1, borderRadius: ring1 / 2 },
          { transform: [{ rotate: innerSpin }] },
        ]} />

        {/* Amber glow disc */}
        <View style={[
          styles.glow,
          { width: dim, height: dim, borderRadius: dim / 2 },
        ]} />

        {/* Sacred Om symbol */}
        <Animated.Text
          style={[
            styles.omText,
            { fontSize: font },
            { transform: [{ scale: omScale }], opacity: omOpacity },
          ]}
        >
          ॐ
        </Animated.Text>
      </View>

      {/* Loading label */}
      <Text style={styles.label}>{text}</Text>

      {/* Three pulsing dots */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, dotStyle(dot)]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  fullScreen: {
    flex: 1,
    paddingVertical: 0,
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(217,119,6,0.35)',
  },
  innerArc: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#f59e0b',
    borderRightColor: '#d97706',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(254,243,199,0.75)',
  },
  omText: {
    color: '#d97706',
    fontWeight: '700',
    zIndex: 2,
    lineHeight: undefined,
  },
  label: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#b45309',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
});
