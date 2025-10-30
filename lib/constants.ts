import { NavItem, Currency } from "@/types"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  Users,
  Settings,
  MapPin,
  DollarSign,
  Calculator,
} from "lucide-react"

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["HQ_Admin", "Branch_Manager"],
  },
  {
    title: "Locations",
    href: "/locations",
    icon: MapPin,
    roles: ["HQ_Admin"],
  },
  {
    title: "Suppliers",
    href: "/suppliers",
    icon: Users,
    roles: ["HQ_Admin"],
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    roles: ["HQ_Admin"],
  },
  {
    title: "Purchase Orders",
    href: "/purchase-orders",
    icon: ShoppingCart,
    roles: ["HQ_Admin"],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Warehouse,
    roles: ["HQ_Admin", "Branch_Manager"],
  },
  {
    title: "Exchange Rates",
    href: "/exchange-rates",
    icon: DollarSign,
    roles: ["HQ_Admin"],
  },
  {
    title: "Pricing",
    href: "/pricing",
    icon: Calculator,
    roles: ["HQ_Admin"],
  },
  {
    title: "Sales",
    href: "/sales",
    icon: TrendingUp,
    roles: ["HQ_Admin", "Branch_Manager"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["HQ_Admin"],
  },
]

// Product unit options
export const PRODUCT_UNITS = [
  { value: 'EA', label: 'EA (Each)' },
  { value: 'BOX', label: 'BOX' },
  { value: 'PACK', label: 'PACK' },
] as const

// Product category options
export const PRODUCT_CATEGORIES = [
  { value: 'skincare', label: 'Skincare' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'haircare', label: 'Haircare' },
  { value: 'bodycare', label: 'Bodycare' },
  { value: 'fragrance', label: 'Fragrance' },
] as const

// Currency symbols (kept for backward compatibility, but using 3-letter codes now)
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KRW: 'KRW',
  VND: 'VND',
  CNY: 'CNY',
}

// Location type options
export const LOCATION_TYPES = [
  { value: 'HQ', label: 'Headquarters' },
  { value: 'Branch', label: 'Branch' },
] as const

// Currency options
export const CURRENCIES = [
  { value: 'KRW', label: 'KRW (Korean Won)' },
  { value: 'VND', label: 'VND (Vietnamese Dong)' },
  { value: 'CNY', label: 'CNY (Chinese Yuan)' },
] as const
