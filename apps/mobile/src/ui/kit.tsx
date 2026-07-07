import { View, Pressable, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useFillProgress, PressableScale } from './motion';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A section title with an optional action on the right. */
export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const { c, space } = useTheme();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
        style,
      ]}
    >
      <Text variant="title">{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="caption" style={{ color: c.accent }}>
            {action.toUpperCase()}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A compact metric tile: label + big value + optional delta. */
export function StatTile({
  label,
  value,
  delta,
  deltaUp,
  icon,
  style,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { c, radius, space } = useTheme();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          paddingVertical: space.lg,
          paddingHorizontal: space.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minWidth: 0 }}>
        {icon}
        <Text variant="caption" tone="textFaint" numberOfLines={1} style={{ flexShrink: 1 }}>
          {label.toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, marginTop: space.sm, minWidth: 0 }}>
        <Text variant="display2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
        {delta ? (
          <Text
            variant="caption"
            numberOfLines={1}
            style={{ color: deltaUp ? c.success : c.textMuted, marginBottom: 4, flexShrink: 1 }}
          >
            {deltaUp ? '▲' : ''} {delta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** A ring showing progress toward a goal; the arc draws in on mount. */
export function ProgressRing({
  progress,
  size = 72,
  stroke = 8,
  color,
  label,
}: {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = color ?? c.accent;
  const animated = useFillProgress(progress);
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - animated.value),
  }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surface2} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          animatedProps={arcProps}
          fill="none"
        />
      </Svg>
      {label ? <Text variant="mono" style={{ fontSize: 13 }}>{label}</Text> : null}
    </View>
  );
}

/** A small rounded chip/tag with press physics when tappable. */
export function Chip({
  label,
  active,
  tint,
  onPress,
}: {
  label: string;
  active?: boolean;
  tint?: string;
  onPress?: () => void;
}) {
  const { c, radius, space } = useTheme();
  const accent = tint ?? c.accent;
  const body = (
    <View
      style={{
        paddingHorizontal: space.md,
        paddingVertical: 7,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: active ? accent : c.border,
        backgroundColor: active ? accent + '18' : 'transparent',
      }}
    >
      <Text variant="caption" style={{ color: active ? accent : c.textMuted }}>
        {label}
      </Text>
    </View>
  );
  return onPress ? (
    <PressableScale onPress={onPress} haptic={false}>
      {body}
    </PressableScale>
  ) : (
    body
  );
}

/** A tappable list row with a leading accent and a chevron. */
export function ListRow({
  title,
  subtitle,
  leading,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { c, space } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{title}</Text>
        {subtitle ? (
          <Text variant="small" tone="textMuted" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={c.textFaint} /> : null)}
    </Pressable>
  );
}

/** A quiet empty state with an icon, message, and optional action. */
export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const { c, space, radius } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: space['3xl'],
        paddingHorizontal: space.xl,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        borderStyle: 'dashed',
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: c.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text variant="bodyMedium" style={{ marginTop: space.md }}>
        {title}
      </Text>
      <Text variant="small" tone="textMuted" style={{ marginTop: 4, textAlign: 'center', maxWidth: 260 }}>
        {body}
      </Text>
    </View>
  );
}

/** Colored dot used as a subject/axis marker. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}
