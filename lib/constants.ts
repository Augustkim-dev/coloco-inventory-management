import { NavItem } from "@/types"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  Users,
  Settings,
} from "lucide-react"

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["HQ_Admin", "Branch_Manager"],
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
