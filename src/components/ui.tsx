import type { CSSProperties, ReactNode } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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

function useResponsiveMetrics() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isAndroidCompact = Platform.OS === 'android' && isCompact;

  return {
    width,
    isCompact,
    isAndroidCompact,
  };
}

export function Page({ children }: { children: ReactNode }) {
  return <PageFrame>{children}</PageFrame>;
}

export function PageFrame({
  children,
  footer,
  contentContainerStyle,
}: {
  children: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.pageBackdrop}>
        <View style={styles.pageGlowTop} />
        <View style={styles.pageGlowBottom} />
        {isAndroidCompact ? <View style={styles.pageGridGlow} /> : null}
      </View>
      <View style={styles.pageFrame}>
        <ScrollView
          contentContainerStyle={[
            styles.pageContent,
            isCompact ? styles.pageContentCompact : null,
            isAndroidCompact ? styles.pageContentAndroidCompact : null,
            footer ? styles.pageContentWithFooter : null,
            contentContainerStyle,
          ]}
          style={styles.page}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.pageFooter}>{footer}</View> : null}
      </View>
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
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();
  const toneStyle = getToneStyle(tone);

  return (
    <View
      style={[
        styles.heroCard,
        isCompact ? styles.heroCardCompact : null,
        isAndroidCompact ? styles.heroCardAndroidCompact : null,
        { backgroundColor: toneStyle.backgroundColor },
      ]}
    >
      <View pointerEvents="none" style={styles.heroAura} />
      <View pointerEvents="none" style={[styles.heroOrbLarge, { backgroundColor: toneStyle.highlight }]} />
      <View pointerEvents="none" style={styles.heroOrbSmall} />
      <Text style={[styles.eyebrow, { color: toneStyle.subtitleColor }]}>{eyebrow}</Text>
      <Text
        style={[
          styles.heroTitle,
          isCompact ? styles.heroTitleCompact : null,
          { color: toneStyle.textColor },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.heroSubtitle,
          isCompact ? styles.heroSubtitleCompact : null,
          { color: toneStyle.subtitleColor },
        ]}
      >
        {subtitle}
      </Text>
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
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();

  return (
    <View
      style={[
        styles.surfaceCard,
        isCompact ? styles.surfaceCardCompact : null,
        isAndroidCompact ? styles.surfaceCardAndroidCompact : null,
        style,
      ]}
    >
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
  const { isCompact } = useResponsiveMetrics();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, isCompact ? styles.sectionTitleCompact : null]}>{title}</Text>
      {description ? (
        <Text style={[styles.sectionDescription, isCompact ? styles.sectionDescriptionCompact : null]}>
          {description}
        </Text>
      ) : null}
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
  const { isCompact } = useResponsiveMetrics();
  const toneMap = {
    primary: { backgroundColor: palette.primarySoft, color: palette.primary, borderColor: '#C8D9EE' },
    accent: { backgroundColor: palette.accentSoft, color: palette.accent, borderColor: '#F0D0C6' },
    blue: { backgroundColor: palette.blueSoft, color: palette.blue, borderColor: '#C9DCF0' },
  };

  const content = (
    <View
      style={[
        styles.metricCard,
        isCompact ? styles.metricCardCompact : null,
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
  const { isCompact } = useResponsiveMetrics();
  const toneStyles = {
    neutral: { backgroundColor: palette.surfaceMuted, color: palette.ink },
    primary: { backgroundColor: palette.primarySoft, color: palette.primary },
    accent: { backgroundColor: palette.accentSoft, color: palette.accent },
    warning: { backgroundColor: palette.goldSoft, color: palette.warning },
    success: { backgroundColor: '#DDF2E8', color: palette.success },
  };

  return (
    <View
      style={[
        styles.pill,
        isCompact ? styles.pillCompact : null,
        { backgroundColor: toneStyles[tone].backgroundColor },
      ]}
    >
      <Text style={[styles.pillLabel, isCompact ? styles.pillLabelCompact : null, { color: toneStyles[tone].color }]}>
        {label}
      </Text>
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
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();
  const variantStyles = {
    primary: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
      color: palette.white,
    },
    secondary: {
      backgroundColor: '#F8F1E7',
      borderColor: '#E8DAC4',
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
        isCompact ? styles.buttonCompact : null,
        isAndroidCompact ? styles.buttonAndroidCompact : null,
        {
          backgroundColor: current.backgroundColor,
          borderColor: current.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, isCompact ? styles.buttonLabelCompact : null, { color: current.color }]}>
        {label}
      </Text>
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
  const { isCompact } = useResponsiveMetrics();

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
        style={[
          styles.input,
          isCompact ? styles.inputCompact : null,
          multiline ? styles.multilineInput : null,
        ]}
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
  const { isCompact } = useResponsiveMetrics();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        isCompact ? styles.choiceChipCompact : null,
        selected ? styles.choiceChipSelected : null,
        pressed ? styles.choiceChipPressed : null,
      ]}
    >
      <Text
        style={[
          styles.choiceChipLabel,
          isCompact ? styles.choiceChipLabelCompact : null,
          selected ? styles.choiceChipLabelSelected : null,
        ]}
      >
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
  const { isCompact } = useResponsiveMetrics();

  return (
    <ScrollView
      horizontal
      contentContainerStyle={[styles.navigationStrip, isCompact ? styles.navigationStripCompact : null]}
      showsHorizontalScrollIndicator={false}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onChange(item.key)}
          style={({ pressed }) => [
            styles.navigationItem,
            isCompact ? styles.navigationItemCompact : null,
            item.key === activeKey ? styles.navigationItemActive : null,
            pressed ? styles.navigationItemPressed : null,
          ]}
        >
          <Text
            style={[
              styles.navigationLabel,
              isCompact ? styles.navigationLabelCompact : null,
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
  const { isCompact } = useResponsiveMetrics();
  return <Text style={[styles.caption, isCompact ? styles.captionCompact : null, style]}>{children}</Text>;
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
    width: 360,
    height: 360,
    borderRadius: radius.pill,
    top: -150,
    left: -110,
    backgroundColor: '#F7DCCF',
    opacity: 0.68,
  },
  pageGlowBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: radius.pill,
    right: -110,
    bottom: -10,
    backgroundColor: '#DDE8F8',
    opacity: 0.58,
  },
  pageGridGlow: {
    position: 'absolute',
    right: -80,
    top: 180,
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(232, 93, 75, 0.08)',
  },
  pageFrame: {
    flex: 1,
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
  pageContentCompact: {
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 116,
    gap: spacing.md,
  },
  pageContentAndroidCompact: {
    paddingTop: spacing.md,
    paddingHorizontal: 14,
  },
  pageContentWithFooter: {
    paddingBottom: 136,
  },
  pageFooter: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  heroCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    ...shadow.card,
  },
  heroCardCompact: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  heroCardAndroidCompact: {
    borderRadius: 30,
  },
  heroAura: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    height: 94,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  heroTitleCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: typeScale.body,
    lineHeight: 24,
    maxWidth: 560,
  },
  heroSubtitleCompact: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: '100%',
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
  surfaceCardCompact: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  surfaceCardAndroidCompact: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 252, 0.98)',
  },
  surfaceAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    height: 5,
    backgroundColor: '#F6E4D7',
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typeScale.title,
    color: palette.ink,
    fontWeight: '800',
  },
  sectionTitleCompact: {
    fontSize: 18,
  },
  sectionDescription: {
    fontSize: typeScale.body,
    lineHeight: 22,
    color: palette.mutedInk,
  },
  sectionDescriptionCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
  },
  metricCardCompact: {
    minWidth: 92,
    borderRadius: 18,
    padding: spacing.sm,
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
  pillCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillLabelCompact: {
    fontSize: 11,
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
  buttonCompact: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  buttonAndroidCompact: {
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  buttonLabelCompact: {
    fontSize: 14,
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
    backgroundColor: '#FFFEFD',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.ink,
    fontSize: 15,
  },
  inputCompact: {
    minHeight: 54,
    borderRadius: 18,
    fontSize: 16,
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
    backgroundColor: '#FFFCF8',
  },
  choiceChipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  choiceChipLabelCompact: {
    fontSize: 12,
  },
  choiceChipLabelSelected: {
    color: palette.white,
  },
  navigationStrip: {
    gap: spacing.sm,
  },
  navigationStripCompact: {
    gap: spacing.xs,
  },
  navigationItem: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#FFFCF8',
  },
  navigationItemCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  navigationLabelCompact: {
    fontSize: 12,
  },
  navigationLabelActive: {
    color: palette.white,
  },
  caption: {
    color: palette.mutedInk,
    fontSize: 13,
    lineHeight: 19,
  },
  captionCompact: {
    fontSize: 12,
    lineHeight: 18,
  },
});
