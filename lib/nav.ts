import {
  LayoutDashboard,
  BookOpen,
  Factory,
  ShoppingCart,
  Warehouse,
  FlaskConical,
  Package,
  Receipt,
  CalendarClock,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "Setup" | "Operations";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: NavGroup;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },

  { href: "/suppliers-materials", label: "Suppliers & Materials", icon: BookOpen, group: "Setup" },
  { href: "/product-catalog", label: "Product Catalog & BOM", icon: Factory, group: "Setup" },

  { href: "/procurement", label: "Procurement & GRN", icon: ShoppingCart, group: "Operations" },
  { href: "/inventory", label: "Inventory Ledger", icon: Warehouse, group: "Operations" },
  { href: "/production", label: "Production & Blend Orders", icon: FlaskConical, group: "Operations" },
  { href: "/packaging", label: "Packaging Orders", icon: Package, group: "Operations" },
  { href: "/sales", label: "Sales & Invoicing", icon: Receipt, group: "Operations" },
  { href: "/reports", label: "Reports", icon: BarChart3, group: "Operations" },
  { href: "/planning", label: "Production Planning", icon: CalendarClock, group: "Operations" },
];
