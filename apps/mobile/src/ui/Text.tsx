import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme, type ThemeColors } from '@/theme';

type Variant =
  | 'display'
  | 'display2'
  | 'title'
  | 'body'
  | 'bodyMedium'
  | 'small'
  | 'caption'
  | 'mono';

type Tone = keyof Pick<
  ThemeColors,
  'text' | 'textMuted' | 'textFaint' | 'accent' | 'gravitas' | 'success' | 'danger'
>;

export function Text({
  variant = 'body',
  tone = 'text',
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { c, type } = useTheme();
  return (
    <RNText
      style={[type[variant] as TextStyle, { color: c[tone] }, style]}
      {...rest}
    />
  );
}
