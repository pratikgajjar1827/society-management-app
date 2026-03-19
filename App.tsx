import { StatusBar } from 'expo-status-bar';

import { AdminShell } from './src/screens/admin/AdminShell';
import { AuthScreen } from './src/screens/AuthScreen';
import { ResidentShell } from './src/screens/resident/ResidentShell';
import { RoleSelectionScreen } from './src/screens/RoleSelectionScreen';
import { SocietySetupWizardScreen } from './src/screens/SocietySetupWizardScreen';
import { WorkspaceSelectionScreen } from './src/screens/WorkspaceSelectionScreen';
import { AppProvider, useApp } from './src/state/AppContext';
import { palette } from './src/theme/tokens';

function AppRoot() {
  const { state } = useApp();

  switch (state.screen) {
    case 'auth':
      return <AuthScreen />;
    case 'workspace':
      return <WorkspaceSelectionScreen />;
    case 'setup':
      return <SocietySetupWizardScreen />;
    case 'role':
      return <RoleSelectionScreen />;
    case 'dashboard':
      return state.session.selectedProfile === 'admin' ? <AdminShell /> : <ResidentShell />;
    default:
      return <AuthScreen />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor={palette.primary} />
      <AppRoot />
    </AppProvider>
  );
}
