import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type ModuleGlyphSize = 'sm' | 'md' | 'lg';

function withAlpha(color: string, alphaHex: string) {
  return color.startsWith('#') && color.length === 7 ? `${color}${alphaHex}` : color;
}

function GlyphCanvas({
  size,
  children,
}: {
  size: number;
  children: ReactNode;
}) {
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {children}
    </View>
  );
}

function GlyphLine({
  left,
  top,
  width,
  height,
  color,
  radius = 999,
  rotate,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  radius?: number;
  rotate?: string;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderRadius: radius,
        backgroundColor: color,
        transform: rotate ? [{ rotate }] : undefined,
      }}
    />
  );
}

export function ModuleGlyph({
  module,
  color,
  size = 'md',
}: {
  module: string;
  color: string;
  size?: ModuleGlyphSize;
}) {
  const dimension = size === 'sm' ? 16 : size === 'lg' ? 28 : 20;
  const soft = withAlpha(color, '2E');
  const medium = withAlpha(color, '66');
  const glow = withAlpha(color, '18');
  const orbSize = Math.max(5, Math.round(dimension * 0.34));
  const chipWidth = Math.max(6, Math.round(dimension * 0.38));
  const chipHeight = Math.max(4, Math.round(dimension * 0.2));

  const backdrop = (
    <>
      <GlyphLine left={0} top={1} width={dimension - 3} height={dimension - 3} color={glow} radius={Math.round(dimension / 2)} />
      <GlyphLine left={dimension - orbSize} top={0} width={orbSize} height={orbSize} color={soft} radius={Math.round(orbSize / 2)} />
      <GlyphLine left={1} top={dimension - chipHeight - 1} width={chipWidth} height={chipHeight} color={soft} radius={chipHeight} />
    </>
  );

  const glyph = (() => {
    switch (module) {
      case 'VS':
      case 'VP':
      case 'AC':
      case 'IN':
      case 'SD':
      case 'GD':
      case 'KY':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={2} top={5} width={9} height={9} color={soft} radius={5} />
            <GlyphLine left={9} top={2} width={15} height={10} color={medium} radius={4} />
            <GlyphLine left={12} top={5} width={9} height={2} color={color} />
            <GlyphLine left={12} top={9} width={6} height={2} color={color} />
            <GlyphLine left={5} top={15} width={12} height={8} color={color} radius={5} />
          </GlyphCanvas>
        );
      case 'BL':
      case 'PY':
      case 'DU':
      case 'RC':
      case 'RM':
      case 'CL':
      case 'PF':
      case 'UP':
      case 'LG':
      case 'AU':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={4} top={2} width={16} height={22} color={soft} radius={5} />
            <GlyphLine left={6} top={5} width={12} height={2} color={color} />
            <GlyphLine left={6} top={10} width={10} height={2} color={color} />
            <GlyphLine left={6} top={15} width={8} height={2} color={color} />
            <GlyphLine left={13} top={16} width={7} height={7} color={medium} radius={4} />
          </GlyphCanvas>
        );
      case 'SC':
      case 'DR':
      case 'CT':
      case 'UT':
      case 'OP':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={2} top={11} width={6} height={13} color={medium} radius={3} />
            <GlyphLine left={10} top={6} width={6} height={18} color={color} radius={3} />
            <GlyphLine left={18} top={2} width={6} height={22} color={soft} radius={3} />
          </GlyphCanvas>
        );
      case 'RS':
      case 'RD':
      case 'ST':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={4} top={6} width={7} height={7} color={medium} radius={4} />
            <GlyphLine left={13} top={4} width={8} height={8} color={soft} radius={4} />
            <GlyphLine left={3} top={15} width={9} height={7} color={color} radius={4} />
            <GlyphLine left={13} top={14} width={10} height={8} color={medium} radius={4} />
          </GlyphCanvas>
        );
      case 'SV':
      case 'AM':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={9} top={2} width={10} height={10} color={soft} radius={5} />
            <GlyphLine left={4} top={13} width={8} height={8} color={medium} radius={4} />
            <GlyphLine left={15} top={14} width={7} height={7} color={color} radius={4} />
            <GlyphLine left={7} top={7} width={12} height={2} color={color} rotate="45deg" />
            <GlyphLine left={7} top={7} width={12} height={2} color={color} rotate="-45deg" />
          </GlyphCanvas>
        );
      case 'HD':
      case 'FM':
      case 'CP':
      case 'IS':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={4} top={6} width={16} height={12} color={soft} radius={6} />
            <GlyphLine left={9} top={16} width={6} height={6} color={soft} rotate="45deg" radius={2} />
            <GlyphLine left={7} top={10} width={10} height={2} color={color} />
            <GlyphLine left={7} top={14} width={7} height={2} color={color} />
          </GlyphCanvas>
        );
      case 'DH':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={8} top={3} width={8} height={8} color={medium} radius={4} />
            <GlyphLine left={5} top={12} width={14} height={10} color={color} radius={5} />
            <GlyphLine left={18} top={5} width={4} height={10} color={soft} radius={2} rotate="18deg" />
          </GlyphCanvas>
        );
      case 'BK':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={4} top={5} width={16} height={17} color={soft} radius={4} />
            <GlyphLine left={4} top={5} width={16} height={5} color={medium} radius={4} />
            <GlyphLine left={7} top={2} width={2} height={6} color={color} />
            <GlyphLine left={15} top={2} width={2} height={6} color={color} />
            <GlyphLine left={8} top={13} width={3} height={3} color={color} radius={2} />
            <GlyphLine left={13} top={13} width={3} height={3} color={color} radius={2} />
          </GlyphCanvas>
        );
      case 'MV':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={2} top={10} width={14} height={8} color={medium} radius={3} />
            <GlyphLine left={15} top={12} width={7} height={6} color={color} radius={3} />
            <GlyphLine left={5} top={17} width={5} height={5} color={color} radius={3} />
            <GlyphLine left={16} top={17} width={5} height={5} color={color} radius={3} />
          </GlyphCanvas>
        );
      case 'NT':
      case 'AN':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={5} top={2} width={14} height={20} color={soft} radius={4} />
            <GlyphLine left={8} top={7} width={8} height={2} color={color} />
            <GlyphLine left={8} top={11} width={8} height={2} color={color} />
            <GlyphLine left={8} top={15} width={6} height={2} color={color} />
          </GlyphCanvas>
        );
      case 'HM':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={6} top={5} width={12} height={12} color={soft} radius={4} />
            <GlyphLine left={5} top={5} width={14} height={3} color={color} rotate="-35deg" />
            <GlyphLine left={9} top={13} width={6} height={9} color={color} radius={2} />
          </GlyphCanvas>
        );
      case 'ME':
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={8} top={3} width={8} height={8} color={medium} radius={4} />
            <GlyphLine left={5} top={13} width={14} height={10} color={soft} radius={5} />
            <GlyphLine left={8} top={14} width={8} height={8} color={color} radius={4} />
          </GlyphCanvas>
        );
      default:
        return (
          <GlyphCanvas size={dimension}>
            {backdrop}
            <GlyphLine left={4} top={4} width={16} height={16} color={soft} radius={6} />
            <GlyphLine left={8} top={8} width={8} height={8} color={color} radius={4} />
          </GlyphCanvas>
        );
    }
  })();

  return <View style={styles.root}>{glyph}</View>;
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
