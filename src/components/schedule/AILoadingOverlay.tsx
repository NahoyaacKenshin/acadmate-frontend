import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Sparkles } from 'lucide-react-native';

const STATUS_MESSAGES = [
  'Reading your document…',
  'Detecting your schedule…',
  'Organising the results…',
  'Almost done…',
];

interface AILoadingOverlayProps {
  visible: boolean;
}

export function AILoadingOverlay({ visible }: AILoadingOverlayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [statusIndex, setStatusIndex] = React.useState(0);

  useEffect(() => {
    if (!visible) {
      setStatusIndex(0);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse glow ring
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Slow rotate
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    // Cycle status messages
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);

    return () => {
      pulse.stop();
      rotate.stop();
      clearInterval(interval);
    };
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          {/* Outer glow ring */}
          <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />

          {/* Spinning border ring */}
          <Animated.View style={[styles.spinRing, { transform: [{ rotate: spin }] }]} />

          {/* Icon circle */}
          <View style={styles.iconCircle}>
            <Sparkles size={32} color="#6C8EFF" />
          </View>

          {/* Status text */}
          <Text style={styles.title}>AcadMate AI</Text>
          <Text style={styles.status}>{STATUS_MESSAGES[statusIndex]}</Text>

          {/* Dot loader */}
          <DotLoader />
        </View>
      </Animated.View>
    </Modal>
  );
}

function DotLoader() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(800),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={styles.dotRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 19, 28, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(108, 142, 255, 0.12)',
  },
  spinRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#6C8EFF',
    borderRightColor: 'rgba(108, 142, 255, 0.3)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#161A26',
    borderWidth: 1,
    borderColor: '#2A3143',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  status: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    textAlign: 'center',
    minWidth: 200,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C8EFF',
  },
});
