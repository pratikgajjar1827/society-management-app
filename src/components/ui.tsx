import { useState, type CSSProperties, type ReactNode } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Platform,
  Pressable,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme, type AppThemeColors } from '../theme/appTheme';
import { palette, radius, shadow, spacing, typeScale } from '../theme/tokens';

type Tone = 'primary' | 'accent' | 'muted';
type DateTimeFieldMode = 'date' | 'time' | 'datetime';

function padDateTimeSegment(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateTimeFieldValue(value: Date, mode: DateTimeFieldMode) {
  const year = value.getFullYear();
  const month = padDateTimeSegment(value.getMonth() + 1);
  const day = padDateTimeSegment(value.getDate());
  const hours = padDateTimeSegment(value.getHours());
  const minutes = padDateTimeSegment(value.getMinutes());

  if (mode === 'date') {
    return `${year}-${month}-${day}`;
  }

  if (mode === 'time') {
    return `${hours}:${minutes}`;
  }

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeFieldValue(value: string, mode: DateTimeFieldMode) {
  const fallback = new Date();

  if (!value) {
    return fallback;
  }

  if (mode === 'date') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return fallback;
    }

    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  }

  if (mode === 'time') {
    const match = value.match(/^(\d{2}):(\d{2})$/);

    if (!match) {
      return fallback;
    }

    const next = new Date(fallback);
    next.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return next;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function getToneStyle(theme: AppThemeColors, tone: Tone) {
  switch (tone) {
    case 'accent':
      return {
        backgroundColor: theme.accent,
        highlight: theme.gold,
        textColor: theme.white,
        subtitleColor: theme.mode === 'night' ? '#FEE1DB' : '#FFF0E8',
      };
    case 'muted':
      return {
        backgroundColor: theme.blue,
        highlight: theme.primarySoft,
        textColor: theme.white,
        subtitleColor: theme.mode === 'night' ? '#D8E6F8' : '#E8F2FB',
      };
    default:
      return {
        backgroundColor: theme.primary,
        highlight: theme.accent,
        textColor: theme.mode === 'night' ? '#0E1720' : theme.white,
        subtitleColor: theme.mode === 'night' ? '#334B61' : '#DAE6F3',
      };
  }
}

function useResponsiveMetrics() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isPhone = width < 420;
  const isAndroidCompact = Platform.OS === 'android' && isCompact;

  return {
    width,
    isCompact,
    isPhone,
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
  const { theme } = useAppTheme();
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.background }]}> 
      <View pointerEvents="none" style={styles.pageBackdrop}>
        <View style={[styles.pageGlowTop, { backgroundColor: theme.backdropTop }]} />
        <View style={[styles.pageGlowBottom, { backgroundColor: theme.backdropBottom }]} />
        {isAndroidCompact ? <View style={[styles.pageGridGlow, { backgroundColor: theme.gridGlow }]} /> : null}
      </View>
      <View style={styles.pageFrame}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.pageContent,
            isCompact ? styles.pageContentCompact : null,
            isAndroidCompact ? styles.pageContentAndroidCompact : null,
            footer ? styles.pageContentWithFooter : null,
            contentContainerStyle,
          ]}
          style={[styles.page, { backgroundColor: theme.background }]}
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
  const { theme } = useAppTheme();
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();
  const toneStyle = getToneStyle(theme, tone);

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
          isAndroidCompact ? styles.heroTitleAndroidCompact : null,
          { color: toneStyle.textColor },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.heroSubtitle,
          isCompact ? styles.heroSubtitleCompact : null,
          isAndroidCompact ? styles.heroSubtitleAndroidCompact : null,
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
  const { theme } = useAppTheme();
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();

  return (
    <View
      style={[
        styles.surfaceCard,
        isCompact ? styles.surfaceCardCompact : null,
        isAndroidCompact ? styles.surfaceCardAndroidCompact : null,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor },
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.surfaceAccent, { backgroundColor: theme.mode === 'night' ? 'rgba(255,255,255,0.03)' : '#FFF7EF' }]} />
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
  const { theme } = useAppTheme();
  const { isCompact, isPhone } = useResponsiveMetrics();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, isCompact ? styles.sectionTitleCompact : null, { color: theme.ink }]}>{title}</Text>
      {description && !isPhone ? (
        <Text style={[styles.sectionDescription, isCompact ? styles.sectionDescriptionCompact : null, { color: theme.mutedInk }]}>
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
  const { theme } = useAppTheme();
  const { isCompact, isAndroidCompact, isPhone } = useResponsiveMetrics();
  const toneMap = {
    primary: { backgroundColor: theme.primarySoft, color: theme.primary, borderColor: theme.mode === 'night' ? '#35506A' : '#C8D9EE' },
    accent: { backgroundColor: theme.accentSoft, color: theme.accent, borderColor: theme.mode === 'night' ? '#65403E' : '#F0D0C6' },
    blue: { backgroundColor: theme.blueSoft, color: theme.blue, borderColor: theme.mode === 'night' ? '#385270' : '#C9DCF0' },
  };

  const content = (
    <View
      style={[
        styles.metricCard,
        isCompact ? styles.metricCardCompact : null,
        !onPress && isPhone ? styles.metricCardPhone : null,
        onPress && isPhone ? styles.metricCardPressableInnerPhone : null,
        {
          backgroundColor: toneMap[tone].backgroundColor,
          borderColor: toneMap[tone].borderColor,
        },
      ]}
      >
      <Text
        style={[styles.metricLabel, isCompact ? styles.metricLabelCompact : null, isPhone ? styles.metricLabelPhone : null, { color: theme.mutedInk }]}
        numberOfLines={isPhone ? 3 : 2}
      >
        {label}
      </Text>
      <Text style={[
        styles.metricValue,
        isCompact ? styles.metricValueCompact : null,
        isPhone ? styles.metricValuePhone : null,
        isAndroidCompact ? styles.metricValueAndroidCompact : null,
        { color: toneMap[tone].color },
      ]}>
        {value}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.metricPressable, isPhone ? styles.metricPressablePhone : null, pressed ? styles.metricPressed : null]}
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
  const { theme } = useAppTheme();
  const { isCompact } = useResponsiveMetrics();
  const toneStyles = {
    neutral: { backgroundColor: theme.surfaceMuted, color: theme.ink },
    primary: { backgroundColor: theme.primarySoft, color: theme.primary },
    accent: { backgroundColor: theme.accentSoft, color: theme.accent },
    warning: { backgroundColor: theme.goldSoft, color: theme.warning },
    success: { backgroundColor: theme.mode === 'night' ? '#17372B' : '#DDF2E8', color: theme.success },
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
  const { theme } = useAppTheme();
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();
  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
      color: theme.mode === 'night' ? '#0E1720' : theme.white,
    },
    secondary: {
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.border,
      color: theme.ink,
    },
    ghost: {
      backgroundColor: theme.mode === 'night' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
      borderColor: theme.mode === 'night' ? 'rgba(138,165,194,0.2)' : 'rgba(255,255,255,0.16)',
      color: theme.mode === 'night' ? theme.ink : theme.white,
    },
    danger: {
      backgroundColor: theme.danger,
      borderColor: theme.danger,
      color: theme.mode === 'night' ? '#211314' : theme.white,
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
  const { theme } = useAppTheme();

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.mutedInk }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.ink }]}>{value}</Text>
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
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  nativeType?: 'text' | 'date' | 'email' | 'tel';
  secureTextEntry?: boolean;
}) {
  const { theme } = useAppTheme();
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
        placeholderTextColor={theme.mutedInk}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          isCompact ? styles.inputCompact : null,
          multiline ? styles.multilineInput : null,
          { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink },
        ]}
        value={value}
      />
    </View>
  );
}

export function DateTimeField({
  label,
  value,
  onChangeText,
  placeholder,
  mode,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  mode: DateTimeFieldMode;
}) {
  const { isCompact } = useResponsiveMetrics();
  const [showPicker, setShowPicker] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time'>(mode === 'time' ? 'time' : 'date');
  const [draftDateValue, setDraftDateValue] = useState<Date | null>(null);
  const resolvedValue = parseDateTimeFieldValue(value, mode);

  function resetPickerState() {
    setShowPicker(false);
    setDraftDateValue(null);
    setAndroidPickerMode(mode === 'time' ? 'time' : 'date');
  }

  function openPicker() {
    if (Platform.OS !== 'android') {
      return;
    }

    setDraftDateValue(resolvedValue);
    setAndroidPickerMode(mode === 'time' ? 'time' : 'date');
    setShowPicker(true);
  }

  function handlePickerChange(event: DateTimePickerEvent, selectedValue?: Date) {
    if (event.type === 'dismissed' || !selectedValue) {
      resetPickerState();
      return;
    }

    if (mode === 'datetime' && androidPickerMode === 'date') {
      const nextDraft = new Date(selectedValue);
      const baseTime = draftDateValue ?? resolvedValue;
      nextDraft.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);
      setDraftDateValue(nextDraft);
      setAndroidPickerMode('time');
      return;
    }

    if (mode === 'datetime') {
      const nextValue = new Date(draftDateValue ?? resolvedValue);
      nextValue.setHours(selectedValue.getHours(), selectedValue.getMinutes(), 0, 0);
      onChangeText(formatDateTimeFieldValue(nextValue, mode));
      resetPickerState();
      return;
    }

    onChangeText(formatDateTimeFieldValue(selectedValue, mode));
    resetPickerState();
  }

  if (typeof document !== 'undefined') {
    const webInputType = mode === 'date' ? 'date' : mode === 'time' ? 'time' : 'datetime-local';

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
          type={webInputType}
          value={value}
        />
      </View>
    );
  }

  if (Platform.OS !== 'android') {
    return (
      <InputField
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={openPicker} style={({ pressed }) => [styles.pickerInput, isCompact ? styles.pickerInputCompact : null, pressed ? styles.metricPressed : null]}>
        <Text style={[styles.pickerInputText, !value ? styles.pickerInputPlaceholder : null]}>
          {value || placeholder || (mode === 'date' ? 'Select date' : mode === 'time' ? 'Select time' : 'Select date and time')}
        </Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          display="default"
          is24Hour
          mode={mode === 'datetime' ? androidPickerMode : mode}
          onChange={handlePickerChange}
          value={draftDateValue ?? resolvedValue}
        />
      ) : null}
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
  const { theme } = useAppTheme();
  const { isCompact } = useResponsiveMetrics();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        isCompact ? styles.choiceChipCompact : null,
        selected ? styles.choiceChipSelected : null,
        !selected ? { backgroundColor: theme.surface, borderColor: theme.border } : null,
        selected ? { backgroundColor: theme.primarySoft, borderColor: theme.primary } : null,
        pressed ? styles.choiceChipPressed : null,
      ]}
    >
      <Text
        style={[
          styles.choiceChipLabel,
          isCompact ? styles.choiceChipLabelCompact : null,
          selected ? styles.choiceChipLabelSelected : null,
          { color: selected ? theme.primary : theme.ink },
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
  const { theme } = useAppTheme();
  const { isCompact, isAndroidCompact } = useResponsiveMetrics();

  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.navigationStrip, isCompact ? styles.navigationStripCompact : null]}
      style={{ backgroundColor: 'transparent' }}
      showsHorizontalScrollIndicator={false}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onChange(item.key)}
          style={({ pressed }) => [
            styles.navigationItem,
            isCompact ? styles.navigationItemCompact : null,
            isAndroidCompact ? styles.navigationItemAndroidCompact : null,
            item.key === activeKey ? styles.navigationItemActive : null,
            item.key === activeKey
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : { backgroundColor: theme.surface, borderColor: theme.border },
            pressed ? styles.navigationItemPressed : null,
          ]}
        >
          <Text
            style={[
              styles.navigationLabel,
              isCompact ? styles.navigationLabelCompact : null,
              isAndroidCompact ? styles.navigationLabelAndroidCompact : null,
              item.key === activeKey ? styles.navigationLabelActive : null,
              { color: item.key === activeKey ? (theme.mode === 'night' ? '#0E1720' : theme.white) : theme.ink },
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
  const { theme } = useAppTheme();
  const { isCompact } = useResponsiveMetrics();
  return <Text style={[styles.caption, isCompact ? styles.captionCompact : null, { color: theme.mutedInk }, style]}>{children}</Text>;
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
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: 104,
    gap: spacing.sm,
  },
  pageContentAndroidCompact: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pageContentWithFooter: {
    paddingBottom: Platform.OS === 'android' ? 180 : 136,
  },
  pageFooter: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: Platform.OS === 'android' ? spacing.xl : spacing.lg,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
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
  heroTitleAndroidCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  heroSubtitleAndroidCompact: {
    fontSize: 13,
    lineHeight: 19,
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
    padding: spacing.sm,
    borderRadius: 18,
    gap: spacing.xs,
  },
  surfaceCardAndroidCompact: {
    borderRadius: 20,
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
    minHeight: 96,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  metricCardCompact: {
    minWidth: 84,
    minHeight: 84,
    borderRadius: 16,
    padding: spacing.xs,
  },
  metricCardPhone: {
    flex: 0,
    width: '48.5%',
    maxWidth: '48.5%',
    minWidth: 0,
    minHeight: 78,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
  },
  metricCardPressableInnerPhone: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    minHeight: 78,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
  },
  metricPressable: {
    flex: 1,
    minWidth: 100,
  },
  metricPressablePhone: {
    flex: 0,
    width: '48.5%',
    maxWidth: '48.5%',
    minWidth: 0,
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
  metricLabelCompact: {
    fontSize: 12,
  },
  metricLabelPhone: {
    fontSize: 10,
    lineHeight: 13,
  },
  metricValueCompact: {
    fontSize: 24,
  },
  metricValuePhone: {
    fontSize: 17,
    lineHeight: 20,
  },
  metricValueAndroidCompact: {
    fontSize: 20,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  pillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
  },
  buttonAndroidCompact: {
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  buttonLabelCompact: {
    fontSize: 13,
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
    minHeight: 48,
    borderRadius: 16,
    fontSize: 15,
  },
  pickerInput: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFFEFD',
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    ...shadow.card,
  },
  pickerInputCompact: {
    minHeight: 48,
    borderRadius: 16,
  },
  pickerInputText: {
    color: palette.ink,
    fontSize: 15,
  },
  pickerInputPlaceholder: {
    color: palette.mutedInk,
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
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    gap: 4,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  navigationItemAndroidCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    fontSize: 11,
  },
  navigationLabelAndroidCompact: {
    fontSize: 10,
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
