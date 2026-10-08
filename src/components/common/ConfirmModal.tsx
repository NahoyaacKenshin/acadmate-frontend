import React, { useMemo } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeColors } from '@/src/theme/tokens';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (!visible) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 size={24} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={24} color="#F59E0B" />;
      case 'info':
        return <AlertCircle size={24} color={colors.primary} />;
      default:
        return <AlertCircle size={24} color={colors.primary} />;
    }
  };

  const getAccentBg = () => {
    switch (variant) {
      case 'danger':
        return isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)';
      case 'warning':
        return isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.1)';
      case 'info':
        return isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)';
    }
  };

  const getConfirmBtnStyle = () => {
    switch (variant) {
      case 'danger':
        return styles.confirmBtnDanger;
      case 'warning':
        return styles.confirmBtnWarning;
      case 'info':
        return styles.confirmBtnInfo;
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
          <View style={styles.backdrop} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(200)}
          exiting={ZoomOut.duration(150)}
          style={styles.modalCard}
        >
          <View style={[styles.iconContainer, { backgroundColor: getAccentBg() }]}>
            {getIcon()}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, getConfirmBtnStyle()]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    backdrop: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    modalCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.4 : 0.12,
      shadowRadius: 12,
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 8,
      includeFontPadding: false,
    },
    description: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
      includeFontPadding: false,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      backgroundColor: isDark ? colors.background : colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
      includeFontPadding: false,
    },
    confirmBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnDanger: {
      backgroundColor: '#EF4444',
    },
    confirmBtnWarning: {
      backgroundColor: '#F59E0B',
    },
    confirmBtnInfo: {
      backgroundColor: colors.primary,
    },
    confirmBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      includeFontPadding: false,
    },
  });
}
