import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Calendar, CheckCircle2, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/src/theme/useTheme';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: (color: string) => React.ReactNode;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Academic Timetable & Set Rules',
    subtitle: 'Automated schedule tracking with Set A & Set B alternating modalities, exam periods, and room assignments.',
    icon: (color: string) => <Calendar size={40} color={color} />,
  },
  {
    id: '2',
    title: 'Grounded Study Notebooks',
    subtitle: 'Attach course materials, lecture slides, and notes for context-grounded AI search and summarization.',
    icon: () => (
      <Image
        source={require('../assets/images/new-splash-favicon-icon.png')}
        style={{ width: 44, height: 44 }}
        resizeMode="contain"
      />
    ),
  },
  {
    id: '3',
    title: 'Offline-First SQLite Architecture',
    subtitle: 'Fast local-first database sync ensures your coursework and timetable are accessible even without internet.',
    icon: (color: string) => <CheckCircle2 size={40} color={color} />,
  },
];

export default function IntroScreen() {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/(app)');
    }
  };

  const handleSkip = () => {
    router.replace('/(app)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Skip */}
      <View style={styles.header}>
        <Image
          source={require('../assets/images/new-splash-favicon-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Animated.View
              entering={FadeInDown.springify()}
              style={[
                styles.iconCircle,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {item.icon('#6366F1')}
            </Animated.View>
            <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Footer (Dots + Button) */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: colors.border },
                i === currentIndex && {
                  width: 24,
                  backgroundColor: '#6366F1',
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  logo: {
    width: 42,
    height: 42,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
