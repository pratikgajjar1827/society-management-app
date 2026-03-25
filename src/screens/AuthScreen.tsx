import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  InputField,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { palette, spacing } from '../theme/tokens';

function formatChallengeExpiry(value: string | undefined) {
  if (!value) {
    return 'Expires in about 10 minutes.';
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return 'Expires in about 10 minutes.';
  }

  return `Active until ${new Date(parsed).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}.`;
}

export function AuthScreen() {
  const { state, actions } = useApp();
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(18)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(30)).current;
  const phoneFloat = useRef(new Animated.Value(0)).current;

  const challenge = state.pendingChallenge;
  const expiryLabel = formatChallengeExpiry(challenge?.expiresAt);

  useEffect(() => {
    const entryAnimation = Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 520,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 520,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(phoneFloat, {
          toValue: -8,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(phoneFloat, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    entryAnimation.start();
    floatAnimation.start();

    return () => {
      entryAnimation.stop();
      floatAnimation.stop();
    };
  }, [heroOpacity, heroTranslateY, phoneFloat, sheetOpacity, sheetTranslateY]);

  useEffect(() => {
    setCode('');
  }, [challenge?.challengeId]);

  useEffect(() => {
    if (challenge?.provider === 'development' && challenge.developmentCode) {
      setCode(challenge.developmentCode);
    }
  }, [challenge?.challengeId, challenge?.developmentCode, challenge?.provider]);

  useEffect(() => {
    setDestination('');
    setCode('');
  }, [state.screen]);

  return (
    <Page>
      <View style={styles.screenStack}>
        <Animated.View
          style={[
            styles.heroStage,
            isCompact ? styles.heroStageCompact : null,
            {
              opacity: heroOpacity,
              transform: [{ translateY: heroTranslateY }],
            },
          ]}
        >
          <View pointerEvents="none" style={styles.heroAuraLarge} />
          <View pointerEvents="none" style={styles.heroAuraSmall} />

          <View style={[styles.heroStrip, isCompact ? styles.heroStripCompact : null]}>
            <View style={[styles.heroContent, isCompact ? styles.heroContentCompact : null]}>
              <View style={styles.entryBadgeRow}>
                <Pill label="Android-style login" tone="warning" />
                <Pill label="One mobile identity" tone="primary" />
              </View>
              <Text style={[styles.entryTitle, isCompact ? styles.entryTitleCompact : null]}>
                One secure login for every society role.
              </Text>
              <Caption style={[styles.entryDescription, isCompact ? styles.entryDescriptionCompact : null]}>
                Request OTP, verify it, and continue into resident, admin, or gate access with a compact mobile-first flow.
              </Caption>
              <View style={[styles.heroHighlights, isCompact ? styles.heroHighlightsCompact : null]}>
                <View style={[styles.heroHighlightCard, isCompact ? styles.heroHighlightCardCompact : null]}>
                  <Text style={styles.heroHighlightValue}>2-step</Text>
                  <Caption>number and OTP</Caption>
                </View>
                <View style={[styles.heroHighlightCard, isCompact ? styles.heroHighlightCardCompact : null]}>
                  <Text style={styles.heroHighlightValue}>Role-aware</Text>
                  <Caption>resident, admin, security</Caption>
                </View>
                <View style={[styles.heroHighlightCard, isCompact ? styles.heroHighlightCardCompact : null]}>
                  <Text style={styles.heroHighlightValue}>Touch-first</Text>
                  <Caption>fast entry on Android-sized screens</Caption>
                </View>
              </View>
            </View>

            <Animated.View
              style={[
                styles.heroDeviceWrap,
                isCompact ? styles.heroDeviceWrapCompact : null,
                { transform: [{ translateY: phoneFloat }] },
              ]}
            >
              <View style={[styles.deviceFrame, isCompact ? styles.deviceFrameCompact : null]}>
                <View style={styles.deviceTopBar} />
                <View style={styles.deviceTilePrimary}>
                  <Text style={styles.deviceTileTitle}>Quick access</Text>
                  <Text style={styles.deviceTileValue}>SocietyOS</Text>
                </View>
                <View style={styles.deviceTileRow}>
                  <View style={styles.deviceMiniTileAccent} />
                  <View style={styles.deviceMiniTileBlue} />
                </View>
                <View style={styles.deviceListCard}>
                  <View style={styles.deviceListLineStrong} />
                  <View style={styles.deviceListLineSoft} />
                  <View style={styles.deviceListLineSoft} />
                </View>
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetDock,
            isCompact ? styles.sheetDockCompact : null,
            {
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <SurfaceCard style={[styles.authSheet, isCompact ? styles.authSheetCompact : null]}>
            <View style={styles.sheetHandle} />
            <SectionHeader
              title="Continue with your mobile number"
              description="The login stays compact, but the flow remains the same: request OTP, verify, then continue into the right workspace."
            />

            <View style={[styles.stepRail, isCompact ? styles.stepRailCompact : null]}>
              <View style={[styles.stepChip, isCompact ? styles.stepChipCompact : null]}>
                <Text style={styles.stepChipNumber}>01</Text>
                <Caption>Enter phone</Caption>
              </View>
              <View style={[styles.stepChip, isCompact ? styles.stepChipCompact : null]}>
                <Text style={styles.stepChipNumber}>02</Text>
                <Caption>Verify OTP</Caption>
              </View>
              <View style={[styles.stepChip, isCompact ? styles.stepChipCompact : null]}>
                <Text style={styles.stepChipNumber}>03</Text>
                <Caption>Open workspace</Caption>
              </View>
            </View>

            <View style={[styles.authWorkspace, isCompact ? styles.authWorkspaceCompact : null]}>
              <View style={[styles.authFlow, isCompact ? styles.authFlowCompact : null]}>
                <View style={[styles.flowCard, isCompact ? styles.flowCardCompact : null]}>
                  <View style={styles.flowHeader}>
                    <Text style={styles.flowNumber}>01</Text>
                    <View style={styles.flowHeaderCopy}>
                      <Text style={styles.flowTitle}>Request OTP</Text>
                      <Caption>Use your primary mobile number to discover linked society workspaces.</Caption>
                    </View>
                  </View>

                  <InputField
                    label="Mobile number"
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />

                  <View style={styles.actionStack}>
                    <ActionButton
                      label={state.isSyncing && !challenge ? 'Sending OTP...' : 'Request OTP'}
                      onPress={() => actions.requestOtp(destination)}
                      disabled={state.isSyncing || destination.trim().length === 0}
                    />
                    <ActionButton
                      label={state.isSyncing ? 'Trying local login...' : 'Development quick login'}
                      onPress={() => actions.loginWithDevelopmentOtp(destination)}
                      disabled={state.isSyncing || destination.trim().length === 0}
                      variant="secondary"
                    />
                  </View>

                  <View style={styles.supportPills}>
                    <Pill label="Resident login" tone="primary" />
                    <Pill label="Admin access" tone="accent" />
                    <Pill label="Single mobile identity" tone="warning" />
                  </View>
                </View>

                <View style={[styles.flowCard, isCompact ? styles.flowCardCompact : null]}>
                  <View style={styles.flowHeader}>
                    <Text style={styles.flowNumber}>02</Text>
                    <View style={styles.flowHeaderCopy}>
                      <Text style={styles.flowTitle}>Verify OTP</Text>
                      <Caption>Enter the code and move straight into your mobile workspace.</Caption>
                    </View>
                  </View>

                  <InputField
                    label="OTP code"
                    value={code}
                    onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter the 6-digit OTP"
                    keyboardType="numeric"
                  />

                  {state.noticeMessage ? (
                    <View style={styles.noticeCard}>
                      <Text style={styles.noticeTitle}>OTP delivery update</Text>
                      <Caption style={styles.noticeText}>{state.noticeMessage}</Caption>
                    </View>
                  ) : null}

                  {state.apiError ? (
                    <View style={styles.errorCard}>
                      <Text style={styles.errorTitle}>Could not request or verify OTP</Text>
                      <Caption style={styles.errorText}>{state.apiError}</Caption>
                    </View>
                  ) : null}

                  {challenge?.provider === 'development' && code ? (
                    <Caption style={styles.devAutoFillHint}>
                      Development backend detected. The OTP has been auto-filled for this request.
                    </Caption>
                  ) : null}

                  <ActionButton
                    label={state.isSyncing && Boolean(challenge) ? 'Verifying OTP...' : 'Verify OTP'}
                    onPress={() => actions.verifyOtp(code)}
                    disabled={state.isSyncing || !challenge || code.trim().length < 4}
                  />

                  {challenge ? (
                    <View style={styles.statusCard}>
                      <Text style={styles.statusTitle}>Code sent to {challenge.destination}</Text>
                      <Caption>{expiryLabel}</Caption>
                    </View>
                  ) : (
                    <View style={styles.statusCard}>
                      <Text style={styles.statusTitle}>Waiting for OTP request</Text>
                      <Caption>Request the OTP first, then enter it here.</Caption>
                    </View>
                  )}

                  {challenge?.provider === 'development' && challenge.developmentCode ? (
                    <View style={styles.devOtpCard}>
                      <Text style={styles.devOtpTitle}>Local OTP for this backend</Text>
                      <Caption style={styles.devHint}>
                        SMS is not configured on this server, so use this generated code to continue login.
                      </Caption>
                      <View style={styles.devOtpActionStack}>
                        <View style={styles.devOtpRow}>
                          <Text style={styles.devOtpValue}>{challenge.developmentCode}</Text>
                          <ActionButton
                            label="Use this OTP"
                            onPress={() => setCode(challenge.developmentCode ?? '')}
                            variant="secondary"
                          />
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {challenge ? (
                    <ActionButton label="Use another mobile number" onPress={actions.resetAuthFlow} variant="secondary" />
                  ) : null}
                </View>
              </View>

              <View style={[styles.infoRail, isCompact ? styles.infoRailCompact : null]}>
                <View style={styles.infoHeroCard}>
                  <Text style={styles.infoHeroTitle}>One app for residents, committees, and gate teams</Text>
                  <Caption>
                    The same login opens the correct workspace based on the society roles attached to your identity.
                  </Caption>
                </View>

                <View style={styles.infoList}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Create or join society</Text>
                    <Caption>New users can start with OTP and continue into the guided join flow.</Caption>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Workspace aware</Text>
                    <Caption>Linked societies and profiles appear after verification without extra logins.</Caption>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Modern mobile feel</Text>
                    <Caption>Raised sheet, large tap targets, and subtle motion without changing the app flow.</Caption>
                  </View>
                </View>

                <View style={styles.supportPills}>
                  <Pill label="Create or join society" tone="warning" />
                  <Pill label="Workspace aware" tone="primary" />
                  <Pill label="Modern mobile experience" tone="accent" />
                </View>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    gap: spacing.md,
  },
  heroStage: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 34,
    backgroundColor: '#183246',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 92,
    borderWidth: 1,
    borderColor: '#274761',
  },
  heroStageCompact: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 74,
  },
  heroAuraLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(110, 155, 202, 0.18)',
    top: -70,
    right: -30,
  },
  heroAuraSmall: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 93, 75, 0.14)',
    left: -64,
    bottom: -90,
  },
  sheetDock: {
    marginTop: -64,
    paddingHorizontal: spacing.lg,
  },
  sheetDockCompact: {
    marginTop: -56,
    paddingHorizontal: 0,
  },
  authSheet: {
    gap: spacing.md,
    borderRadius: 30,
    backgroundColor: '#FFFDFC',
  },
  authSheetCompact: {
    borderRadius: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#DBCBB7',
    marginBottom: 2,
  },
  heroStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  heroStripCompact: {
    gap: spacing.md,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  heroContent: {
    flex: 1,
    minWidth: 280,
    gap: spacing.sm,
  },
  heroContentCompact: {
    minWidth: 0,
  },
  entryBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  entryTitle: {
    color: palette.white,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    maxWidth: 520,
  },
  entryTitleCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  entryDescription: {
    maxWidth: 580,
    fontSize: 15,
    lineHeight: 22,
    color: '#D9E5F1',
  },
  entryDescriptionCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroHighlightsCompact: {
    gap: spacing.xs,
  },
  heroHighlightCard: {
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 2,
  },
  heroHighlightCardCompact: {
    flex: 1,
    minWidth: 0,
  },
  heroHighlightValue: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '800',
  },
  heroDeviceWrap: {
    minWidth: 164,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDeviceWrapCompact: {
    width: '100%',
    minWidth: 0,
    alignItems: 'flex-start',
  },
  deviceFrame: {
    width: 168,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#305272',
    backgroundColor: '#102535',
    padding: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#5A4634',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  deviceFrameCompact: {
    width: 150,
    alignSelf: 'flex-start',
  },
  deviceTopBar: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  deviceTilePrimary: {
    borderRadius: 20,
    backgroundColor: '#24465E',
    padding: spacing.sm,
    gap: 4,
  },
  deviceTileTitle: {
    color: '#B6CBDD',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceTileValue: {
    color: palette.white,
    fontSize: 20,
    fontWeight: '800',
  },
  deviceTileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deviceMiniTileAccent: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#E98C7B',
  },
  deviceMiniTileBlue: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#8EB7E0',
  },
  deviceListCard: {
    borderRadius: 18,
    backgroundColor: '#FFF7EE',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  deviceListLineStrong: {
    width: '70%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#24465E',
  },
  deviceListLineSoft: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D8C8B4',
  },
  stepRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepRailCompact: {
    gap: spacing.xs,
  },
  stepChip: {
    flexGrow: 1,
    minWidth: 150,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DDD2',
    backgroundColor: '#FFF8F3',
    gap: 2,
  },
  stepChipCompact: {
    minWidth: 0,
    flexBasis: '100%',
  },
  stepChipNumber: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  authWorkspace: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  authWorkspaceCompact: {
    gap: spacing.md,
    flexDirection: 'column',
  },
  authFlow: {
    flex: 1.35,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  authFlowCompact: {
    width: '100%',
    flexDirection: 'column',
  },
  flowCard: {
    flex: 1,
    minWidth: 270,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EADCCD',
    backgroundColor: '#FFFBF8',
    gap: spacing.sm,
  },
  flowCardCompact: {
    minWidth: 0,
    borderRadius: 20,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flowNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    textAlign: 'center',
    overflow: 'hidden',
    backgroundColor: palette.accentSoft,
    color: palette.accent,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 34,
  },
  flowHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  flowTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  actionStack: {
    gap: spacing.sm,
  },
  infoRail: {
    flex: 0.8,
    minWidth: 240,
    gap: spacing.sm,
  },
  infoRailCompact: {
    minWidth: 0,
    width: '100%',
  },
  infoHeroCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 22,
    backgroundColor: '#24364A',
    gap: spacing.xs,
  },
  infoHeroTitle: {
    color: palette.white,
    fontSize: 18,
    fontWeight: '800',
  },
  infoList: {
    gap: spacing.sm,
  },
  infoCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9DDCF',
    backgroundColor: '#FFFDF9',
    gap: 4,
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  statusCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9DDCF',
    backgroundColor: '#FFF9F1',
    gap: 4,
  },
  noticeCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2D4B7',
    backgroundColor: '#FFF7E8',
    gap: 4,
  },
  noticeTitle: {
    color: '#7B4C06',
    fontSize: 14,
    fontWeight: '800',
  },
  noticeText: {
    color: '#7B4C06',
    fontWeight: '700',
  },
  errorCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7B8B2',
    backgroundColor: '#FFF1EF',
    gap: 4,
  },
  errorTitle: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: palette.danger,
    fontWeight: '700',
  },
  statusTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  devOtpCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1D6B7',
    backgroundColor: '#FFF4E4',
    gap: spacing.xs,
  },
  devOtpTitle: {
    color: '#7B4C06',
    fontSize: 14,
    fontWeight: '800',
  },
  devOtpActionStack: {
    gap: spacing.sm,
  },
  devOtpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  devOtpValue: {
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: '#FFFDF9',
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  supportPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  devHint: {
    fontWeight: '700',
    color: '#7B4C06',
  },
  devAutoFillHint: {
    color: palette.warning,
    fontWeight: '700',
  },
});
