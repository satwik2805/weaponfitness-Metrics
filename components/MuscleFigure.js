import React from 'react';
import { View, Platform } from 'react-native';
import Body from 'react-native-body-highlighter';
import { useTheme } from '../context/ThemeContext';
import Text from './ui/Text';
import { GROUP_BY_KEY, SLUG_TO_GROUP } from './anatomy/muscles';

const Mannequin3D = React.lazy(() => import('./anatomy/Mannequin3D'));

class MannequinErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("MannequinErrorBoundary caught a rendering error. Falling back to 2D view.", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Front + back anatomical figure. On web, this is a fully interactive,
 * rotatable 3D humanoid mannequin. On native (iOS/Android), it falls back
 * gracefully to the static 2D vector highlighting figures for maximum stability.
 */
export default function MuscleFigure({ selectedGroup, onSelectGroup, scale = 0.8, highlightSlugs }) {
  const { colors, space, isDark } = useTheme();

  const slugs = highlightSlugs ?? (selectedGroup ? GROUP_BY_KEY[selectedGroup]?.slugs || [] : []);
  const data = slugs.map((slug) => ({ slug, intensity: 1 }));
  const highlight = [colors.accent, colors.accent];

  const handlePress = (part) => {
    const group = SLUG_TO_GROUP[part?.slug];
    if (group) onSelectGroup?.(group);
  };

  const pane = (side) => (
    <View style={{ alignItems: 'center', gap: space[2] }}>
      <Body
        data={data}
        side={side}
        gender="male"
        scale={scale}
        colors={highlight}
        defaultFill={isDark ? '#202028' : '#D1D1D6'}
        border="none"
        onBodyPartPress={handlePress}
      />
      <Text variant="labelSm" color={isDark ? 'textOnPhotoFaint' : 'textFaint'}>
        {side === 'front' ? 'FRONT' : 'BACK'}
      </Text>
    </View>
  );

  if (Platform.OS === 'web') {
    const fallback2D = (
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: space[4] }}>
        {pane('front')}
        {pane('back')}
      </View>
    );

    return (
      <MannequinErrorBoundary fallback={fallback2D}>
        <React.Suspense fallback={fallback2D}>
          <Mannequin3D selectedGroup={selectedGroup} onSelectGroup={onSelectGroup} />
        </React.Suspense>
      </MannequinErrorBoundary>
    );
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: space[4] }}>
      {pane('front')}
      {pane('back')}
    </View>
  );
}

