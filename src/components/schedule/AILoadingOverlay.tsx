import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Sparkles } from 'lucide-react-native';

export interface ProgressStage {
  step: number;
  label: string;
  detail: string;
  targetProgress: number; // 0.0 to 1.0
  durationMs: number;
}

const STAGES: ProgressStage[] = [
  {
    step: 1,
    label: 'Uploading document',
    detail: 'Transferring file to AcadMate AI…',
    targetProgress: 0.25,
    durationMs: 2000,
  },
  {
    step: 2,
    label: 'Scanning timetable grid',
    detail: 'Detecting days, columns, and rows…',
    targetProgress: 0.55,
    durationMs: 3500,
  },
  {
    step: 3,
    label: 'Extracting class details',
    detail: 'Identifying subjects, rooms, and modalities…',
    targetProgress: 0.82,
    durationMs: 4500,
  },
  {
    step: 4,
    label: 'Organizing your schedule',
    detail: 'Resolving Set A/B and formatting calendar…',
    targetProgress: 0.95,
    durationMs: 6000,
  },
];

interface AILoadingOverlayProps {
  visible: boolean;
}

export function AILoadingOverlay({ visible }: AILoadingOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinClockwise = useRef(new Animated.Value(0)).current;
  const spinCounter = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStageIndex(0);
        progressAnim.setValue(0);
      });
      return;
    }

    // Reset initial values
    setCurrentStageIndex(0);
    progressAnim.setValue(0.08);
    textFadeAnim.setValue(1);

    // Fade overlay in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();

    // Subtle breathing pulse for AI core
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Outer ring clockwise spin
    const spinClockwiseLoop = Animated.loop(
      Animated.timing(spinClockwise, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Inner ring counter-clockwise spin
    const spinCounterLoop = Animated.loop(
      Animated.timing(spinCounter, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    spinClockwiseLoop.start();
    spinCounterLoop.start();

    // Initial progress animation to stage 0 target
    Animated.timing(progressAnim, {
      toValue: STAGES[0].targetProgress,
      duration: STAGES[0].durationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Chain stages chronologically without repeating
    const timers: ReturnType<typeof setTimeout>[] = [];
    let accumulatedTime = STAGES[0].durationMs;

    for (let i = 1; i < STAGES.length; i++) {
      const nextStageIndex = i;
      const stage = STAGES[i];

      const t = setTimeout(() => {
        // Crossfade stage text
        Animated.sequence([
          Animated.timing(textFadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(textFadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();

        // Switch to next stage
        setTimeout(() => {
          setCurrentStageIndex(nextStageIndex);
        }, 150);

        // Smoothly animate progress bar forward
        Animated.timing(progressAnim, {
          toValue: stage.targetProgress,
          duration: stage.durationMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, accumulatedTime);

      timers.push(t);
      accumulatedTime += stage.durationMs;
    }

    return () => {
      pulseLoop.stop();
      spinClockwiseLoop.stop();
      spinCounterLoop.stop();
      timers.forEach((t) => clearTimeout(t));
    };
  }, [visible]);

  const spin = spinClockwise.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = spinCounter.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const currentStage = STAGES[currentStageIndex];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          {/* Top Engine Badge */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>ACADMATE VISION AI</Text>
          </View>

          {/* Futuristic AI Core Container */}
          <View style={styles.coreWrapper}>
            {/* Ambient soft glow halo */}
            <Animated.View style={[styles.ambientHalo, { transform: [{ scale: pulseAnim }] }]} />

            {/* Outer spinning segmented ring */}
            <Animated.View style={[styles.outerRing, { transform: [{ rotate: spin }] }]} />

            {/* Inner counter-spinning ring */}
            <Animated.View style={[styles.innerRing, { transform: [{ rotate: counterSpin }] }]} />

            {/* Core icon disc */}
            <View style={styles.coreDisc}>
              <Sparkles size={26} color="#6C8EFF" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Analyzing Schedule</Text>

          {/* Dynamic Stage Text (cross-faded) */}
          <Animated.View style={[styles.stageTextContainer, { opacity: textFadeAnim }]}>
            <Text style={styles.stageLabel}>{currentStage.label}</Text>
            <Text style={styles.stageDetail}>{currentStage.detail}</Text>
          </Animated.View>

          {/* Multi-segment Step Indicators */}
          <View style={styles.segmentsRow}>
            {STAGES.map((s, idx) => {
              const isDone = idx < currentStageIndex;
              const isActive = idx === currentStageIndex;
              return (
                <View
                  key={s.step}
                  style={[
                    styles.segmentBar,
                    isDone && styles.segmentBarDone,
                    isActive && styles.segmentBarActive,
                  ]}
                />
              );
            })}
          </View>

          {/* Smooth Continuous Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Footnote / Stage Counter */}
          <View style={styles.footerRow}>
            <Text style={styles.stepCounterText}>
              Step {currentStage.step} of {STAGES.length}
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Processing</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 16, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#131722',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(108, 142, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 142, 255, 0.22)',
    marginBottom: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C8EFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A5B4FC',
    letterSpacing: 1.2,
  },
  coreWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  ambientHalo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(108, 142, 255, 0.08)',
  },
  outerRing: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: '#6C8EFF',
    borderRightColor: 'rgba(108, 142, 255, 0.35)',
  },
  innerRing: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderBottomColor: '#8B5CF6',
    borderLeftColor: 'rgba(139, 92, 246, 0.3)',
  },
  coreDisc: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A2132',
    borderWidth: 1,
    borderColor: '#2A344A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  stageTextContainer: {
    alignItems: 'center',
    minHeight: 40,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 2,
    textAlign: 'center',
  },
  stageDetail: {
    fontSize: 12,
    color: '#818CF8',
    textAlign: 'center',
  },
  segmentsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
    marginBottom: 8,
  },
  segmentBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1E2536',
  },
  segmentBarDone: {
    backgroundColor: '#6C8EFF',
  },
  segmentBarActive: {
    backgroundColor: '#818CF8',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#161C2A',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6C8EFF',
    borderRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
});
