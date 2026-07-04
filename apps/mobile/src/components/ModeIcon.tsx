import { Mic, Layers, Zap, Repeat, GraduationCap, Timer } from 'lucide-react-native';
import type { Mode } from '@/data/content';

export function ModeIcon({
  icon,
  size = 18,
  color,
}: {
  icon: Mode['icon'];
  size?: number;
  color: string;
}) {
  switch (icon) {
    case 'layers':
      return <Layers size={size} color={color} />;
    case 'zap':
      return <Zap size={size} color={color} />;
    case 'repeat':
      return <Repeat size={size} color={color} />;
    case 'graduation':
      return <GraduationCap size={size} color={color} />;
    case 'timer':
      return <Timer size={size} color={color} />;
    case 'mic':
    default:
      return <Mic size={size} color={color} />;
  }
}
