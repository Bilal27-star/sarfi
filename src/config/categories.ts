/**
 * Category presentation metadata.
 * The DB stores `icon` (lucide name) and `color` (token name); this maps
 * those stable identifiers to actual components/classes on the client.
 */
import {
  Utensils,
  UtensilsCrossed,
  Pizza,
  Coffee,
  Sandwich,
  Croissant,
  Bike,
  Fuel,
  Droplets,
  Wrench,
  Cog,
  ShowerHead,
  Shield,
  ShoppingBasket,
  Carrot,
  Apple,
  ShoppingCart,
  Beef,
  Drumstick,
  Fish,
  Bus,
  Home,
  HeartPulse,
  ShoppingBag,
  Repeat,
  Users,
  GraduationCap,
  Gamepad2,
  CircleEllipsis,
  Wallet,
  Banknote,
  CreditCard,
  Sparkles,
  Flame,
  Trophy,
  ShieldCheck,
  Medal,
  Target,
  Plane,
  Gift,
  Book,
  Briefcase,
  Heart,
  Music,
  Phone,
  Laptop,
  PawPrint,
  Baby,
  Dumbbell,
  Scissors,
  Car,
  Shirt,
  Film,
  Plug,
  Wifi,
  Stethoscope,
  Pill,
  Landmark,
  PiggyBank,
  Palette,
  Camera,
  Tv,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  'utensils-crossed': UtensilsCrossed,
  pizza: Pizza,
  coffee: Coffee,
  sandwich: Sandwich,
  croissant: Croissant,
  bike: Bike,
  fuel: Fuel,
  droplets: Droplets,
  wrench: Wrench,
  cog: Cog,
  'shower-head': ShowerHead,
  shield: Shield,
  'shopping-basket': ShoppingBasket,
  carrot: Carrot,
  apple: Apple,
  'shopping-cart': ShoppingCart,
  beef: Beef,
  drumstick: Drumstick,
  fish: Fish,
  bus: Bus,
  home: Home,
  'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag,
  repeat: Repeat,
  users: Users,
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  'circle-ellipsis': CircleEllipsis,
  wallet: Wallet,
  banknote: Banknote,
  'credit-card': CreditCard,
  sparkles: Sparkles,
  flame: Flame,
  trophy: Trophy,
  'shield-check': ShieldCheck,
  medal: Medal,
  target: Target,
  plane: Plane,
  gift: Gift,
  book: Book,
  briefcase: Briefcase,
  heart: Heart,
  music: Music,
  phone: Phone,
  laptop: Laptop,
  'paw-print': PawPrint,
  baby: Baby,
  dumbbell: Dumbbell,
  scissors: Scissors,
  car: Car,
  shirt: Shirt,
  film: Film,
  plug: Plug,
  wifi: Wifi,
  stethoscope: Stethoscope,
  pill: Pill,
  landmark: Landmark,
  'piggy-bank': PiggyBank,
  palette: Palette,
  camera: Camera,
  tv: Tv,
}

/** Curated icon keys offered in the category icon picker (a subset of ICONS,
 * general-purpose ones only — excludes achievement-only icons like trophy/medal). */
export const CATEGORY_ICON_KEYS: string[] = [
  'utensils', 'utensils-crossed', 'pizza', 'coffee', 'sandwich', 'croissant',
  'shopping-basket', 'shopping-cart', 'shopping-bag', 'carrot', 'apple', 'beef', 'drumstick', 'fish',
  'bike', 'car', 'bus', 'fuel', 'plane',
  'home', 'plug', 'wifi', 'wrench', 'cog',
  'heart-pulse', 'stethoscope', 'pill', 'dumbbell',
  'graduation-cap', 'book', 'briefcase', 'laptop',
  'gamepad-2', 'film', 'tv', 'music', 'camera', 'palette',
  'gift', 'shirt', 'scissors', 'paw-print', 'baby', 'users',
  'wallet', 'banknote', 'credit-card', 'landmark', 'piggy-bank', 'repeat',
  'circle-ellipsis',
]

export function categoryIcon(name: string): LucideIcon {
  return ICONS[name] ?? CircleEllipsis
}

export type CategoryColorToken =
  | 'primary'
  | 'coral'
  | 'blue'
  | 'yellow'
  | 'purple'
  | 'danger'
  | 'muted'

/** bg = soft tint for icon chips; fg = readable foreground; bar = solid for charts */
export const CATEGORY_COLORS: Record<string, { bg: string; fg: string; bar: string }> = {
  primary: { bg: 'bg-primary-soft', fg: 'text-success', bar: 'var(--color-primary)' },
  coral: { bg: 'bg-coral-100', fg: 'text-coral-600', bar: 'var(--color-accent-coral)' },
  blue: { bg: 'bg-sky-100', fg: 'text-sky-600', bar: 'var(--color-sky-400)' },
  yellow: { bg: 'bg-sun-100', fg: 'text-sun-600', bar: 'var(--color-sun-400)' },
  purple: { bg: 'bg-plum-100', fg: 'text-plum-600', bar: 'var(--color-plum-400)' },
  danger: { bg: 'bg-danger-soft', fg: 'text-danger', bar: 'var(--color-danger)' },
  muted: { bg: 'bg-surface-sunken', fg: 'text-text-secondary', bar: 'var(--color-ink-300)' },
}

export function categoryColor(token: string) {
  return CATEGORY_COLORS[token] ?? CATEGORY_COLORS.muted
}
