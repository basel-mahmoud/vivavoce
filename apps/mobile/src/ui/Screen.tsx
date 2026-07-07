import { ScrollView, View, type ViewStyle, type RefreshControlProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/** A themed screen wrapper with safe-area handling and optional scrolling. */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  contentStyle,
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  const { c, space } = useTheme();
  const padding: ViewStyle = {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space['4xl'],
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
