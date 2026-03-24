import type { CSSProperties, ReactNode } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { palette, radius, shadow, spacing, typeScale } from '../theme/tokens';

type Tone = 'primary' | 'accent' | 'muted';

function getToneStyle(tone: Tone) {
  switch (tone) {
    case 'accent':
      return {
        backgroundColor: palette.accent,
        highlight: palette.gold,
        textColor: palette.white,
        subtitleColor: '#FFF0E8',
      };
    case 'muted':
      return {
        backgroundColor: palette.blue,
        highlight: palette.primarySoft,
        textColor: palette.white,
        subtitleColor: '#E8F2FB',
      };
    default:
      return {
        backgroundColor: palette.primary,
        highlight: palette.accent,
        textColor: palette.white,
        subtitleColor: '#DAE6F3',
      };
  }
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.pageBackdrop}>
        <View style={styles.pageGlowTop} />
        <View style={styles.pageGlowBottom} />
      </View>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        style={styles.page}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function HeroCard({
  eyebrow,
  title,
  subtitle,
  children,
  tone = 'primary',
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
  tone?: Tone;
}) {
  const toneStyle = getToneStyle(tone);

  return (
    <View style={[styles.heroCard, { backgroundColor: toneStyle.backgroundColor }]}>
      <View pointerEvents="none" style={styles.heroAura} />
      <View pointerEvents="none" style={[styles.heroOrbLarge, { backgroundColor: toneStyle.highlight }]} />
      <View pointerEvents="none" style={styles.heroOrbSmall} />
      <Text style={[styles.eyebrow, { color: toneStyle.subtitleColor }]}>{eyebrow}</Text>
      <Text style={[styles.heroTitle, { color: toneStyle.textColor }]}>{title}</Text>
      <Text style={[styles.heroSubtitle, { color: toneStyle.subtitleColor }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.surfaceCard, style]}>
      <View pointerEvents="none" style={styles.surfaceAccent} />
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
    </View>
  );
}

export function MetricCard({
  label,
  value,
  tone = 'primary',
  onPress,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'accent' | 'blue';
  onPress?: () => void;
}) {
  const toneMap = {
    primary: { backgroundColor: palette.primarySoft, color: palette.primary, borderColor: '#C8D9EE' },
    accent: { backgroundColor: palette.accentSoft, color: palette.accent, borderColor: '#F0D0C6' },
    blue: { backgroundColor: palette.blueSoft, color: palette.blue, borderColor: '#C9DCF0' },
  };

  const content = (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: toneMap[tone].backgroundColor,
          borderColor: toneMap[tone].borderColor,
        },
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: toneMap[tone].color }]}>{value}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.metricPressable, pressed ? styles.metricPressed : null]}
    >
      {content}
    </Pressable>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'accent' | 'warning' | 'success';
}) {
  const toneStyles = {
    neutral: { backgroundColor: palette.surfaceMuted, color: palette.ink },
    primary: { backgroundColor: palette.primarySoft, color: palette.primary },
    accent: { backgroundColor: palette.accentSoft, color: palette.accent },
    warning: { backgroundColor: palette.goldSoft, color: palette.warning },
    success: { backgroundColor: '#DDF2E8', color: palette.success },
  };

  return (
    <View style={[styles.pill, { backgroundColor: toneStyles[tone].backgroundColor }]}>
      <Text style={[styles.pillLabel, { color: toneStyles[tone].color }]}>{label}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const variantStyles = {
    primary: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
      color: palette.white,
    },
    secondary: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      color: palette.ink,
    },
    ghost: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderColor: 'rgba(255,255,255,0.16)',
      color: palette.white,
    },
    danger: {
      backgroundColor: palette.danger,
      borderColor: palette.danger,
      color: palette.white,
    },
  };

  const current = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: current.backgroundColor,
          borderColor: current.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: current.color }]}>{label}</Text>
    </Pressable>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  nativeType = 'text',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  nativeType?: 'text' | 'date' | 'email' | 'tel';
}) {
  if (nativeType === 'date' && !multiline && typeof document !== 'undefined') {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <input
          aria-label={label}
          onChange={(event) => onChangeText(event.currentTarget.value)}
          onClick={(event) => {
            event.currentTarget.showPicker?.();
          }}
          onFocus={(event) => {
            event.currentTarget.showPicker?.();
          }}
          placeholder={placeholder}
          style={webNativeInputStyle}
          type="date"
          value={value}
        />
      </View>
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.mutedInk}
        style={[styles.input, multiline ? styles.multilineInput : null]}
        value={value}
      />
    </View>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected ? styles.choiceChipSelected : null,
        pressed ? styles.choiceChipPressed : null,
      ]}
    >
      <Text style={[styles.choiceChipLabel, selected ? styles.choiceChipLabelSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function NavigationStrip<T extends string>({
  items,
  activeKey,
  onChange,
}: {
  items: Array<{ key: T; label: string }>;
  activeKey: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.navigationStrip}
      showsHorizontalScrollIndicator={false}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onChange(item.key)}
          style={({ pressed }) => [
            styles.navigationItem,
            item.key === activeKey ? styles.navigationItemActive : null,
            pressed ? styles.navigationItemPressed : null,
          ]}
        >
          <Text
            style={[
              styles.navigationLabel,
              item.key === activeKey ? styles.navigationLabelActive : null,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Caption({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

const webNativeInputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: `1px solid ${palette.border}`,
  backgroundColor: palette.surface,
  color: palette.ink,
  padding: '12px 14px',
  fontSize: 14,
  lineHeight: '20px',
  outline: 'none',
  boxSizing: 'border-box',
  minHeight: 48,
  boxShadow: '0 10px 24px rgba(16, 37, 59, 0.06)',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  pageBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  pageGlowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: radius.pill,
    top: -120,
    left: -90,
    backgroundColor: '#D9E8F6',
    opacity: 0.55,
  },
  pageGlowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: radius.pill,
    right: -80,
    bottom: 50,
    backgroundColor: '#FCE7DF',
    opacity: 0.42,
  },
  page: {
    flex: 1,
    backgroundColor: palette.background,
  },
  pageContent: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...shadow.card,
  },
  heroAura: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    height: 94,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: radius.pill,
    right: -58,
    top: -32,
    opacity: 0.22,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: radius.pill,
    right: 28,
    bottom: -46,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  eyebrow: {
    fontSize: typeScale.eyebrow,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: typeScale.hero,
    lineHeight: 42,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: typeScale.body,
    lineHeight: 24,
    maxWidth: 560,
  },
  surfaceCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  surfaceAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    height: 1,
    backgroundColor: '#EEF4FB',
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typeScale.title,
    color: palette.ink,
    fontWeight: '800',
  },
  sectionDescription: {
    fontSize: typeScale.body,
    lineHeight: 22,
    color: palette.mutedInk,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
  },
  metricPressable: {
    flex: 1,
    minWidth: 100,
  },
  metricPressed: {
    opacity: 0.92,
  },
  metricLabel: {
    color: palette.mutedInk,
    fontSize: 13,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: typeScale.metric,
    fontWeight: '800',
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    ...shadow.card,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  detailRow: {
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEF6',
    paddingBottom: spacing.md,
  },
  detailLabel: {
    color: palette.mutedInk,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.ink,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  choiceChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  choiceChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  choiceChipPressed: {
    opacity: 0.85,
  },
  choiceChipLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceChipLabelSelected: {
    color: palette.white,
  },
  navigationStrip: {
    gap: spacing.sm,
  },
  navigationItem: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: palette.surface,
  },
  navigationItemActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  navigationItemPressed: {
    opacity: 0.85,
  },
  navigationLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  navigationLabelActive: {
    color: palette.white,
  },
  caption: {
    color: palette.mutedInk,
    fontSize: 13,
    lineHeight: 19,
  },
});
