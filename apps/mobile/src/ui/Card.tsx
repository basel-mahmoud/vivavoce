import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export function Card({
  style,
  inset = false,
  ...rest
}: ViewProps & { inset?: boolean }) {
  const { c, radius, space } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: inset ? c.surface2 : c.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          padding: space.xl,
        },
        style,
      ]}
      {...rest}
    />
  );
}
