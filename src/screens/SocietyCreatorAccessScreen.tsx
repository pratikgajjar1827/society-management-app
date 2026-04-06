import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ActionButton, Caption, InputField, Page, Pill, SurfaceCard } from '../components/ui';
import { useApp } from '../state/AppContext';
import { palette, spacing } from '../theme/tokens';

export function SocietyCreatorAccessScreen() {
  const { state, actions } = useApp();
  const [accessKey, setAccessKey] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  return (
    <Page>
      <View style={[styles.screenStack, isCompact ? styles.screenStackCompact : null]}>
        <SurfaceCard style={[styles.accessSheet, isCompact ? styles.accessSheetCompact : null]}>
          <View style={styles.brandBlock}>
            <Pill label="Creator App" tone="accent" />
            <Text style={styles.brandName}>Society Creator</Text>
            <Text style={[styles.accessTitle, isCompact ? styles.accessTitleCompact : null]}>
              Unlock society setup
            </Text>
            <Caption style={styles.accessDescription}>
              This separate app is only for creating new society workspaces. Enter the internal
              creator access key to continue straight into the setup wizard.
            </Caption>
          </View>

          <View style={styles.formStack}>
            <InputField
              label="Creator access key"
              value={accessKey}
              onChangeText={setAccessKey}
              placeholder="Enter creator access key"
              autoCapitalize="none"
              secureTextEntry
            />

            <ActionButton
              label={state.isSyncing ? 'Unlocking creator app...' : 'Open society creator'}
              onPress={() => actions.requestCreatorAccess(accessKey)}
              disabled={state.isSyncing || accessKey.trim().length === 0}
            />
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>What this app does</Text>
            <Caption>
              Creates society workspaces without exposing resident enrollment, billing, security,
              or OTP login screens in the same app.
            </Caption>
          </View>
        </SurfaceCard>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  screenStackCompact: {
    paddingVertical: spacing.md,
  },
  accessSheet: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFDFC',
  },
  accessSheetCompact: {
    borderRadius: 24,
  },
  brandBlock: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  brandName: {
    color: palette.primary,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  accessTitle: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  accessTitleCompact: {
    fontSize: 20,
    lineHeight: 25,
  },
  accessDescription: {
    color: palette.mutedInk,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 360,
  },
  formStack: {
    gap: spacing.sm,
  },
  tipCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9DDCF',
    backgroundColor: '#FFF9F1',
    gap: 4,
  },
  tipTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
});

