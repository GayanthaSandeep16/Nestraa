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
  Truck,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/lib/auth/roles";

export type NavGroup = "Setup" | "Operations" | "Admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: NavGroup;
  moduleKey: ModuleKey;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, moduleKey: "dashboard" },

  { href: "/suppliers-materials", label: "Suppliers & Materials", icon: BookOpen, group: "Setup", moduleKey: "suppliers-materials" },
  { href: "/product-catalog", label: "Product Catalog & BOM", icon: Factory, group: "Setup", moduleKey: "product-catalog" },
  { href: "/cost-management", label: "Cost Management", icon: Tag, group: "Setup", moduleKey: "cost-management" },

  { href: "/procurement", label: "Procurement & GRN", icon: ShoppingCart, group: "Operations", moduleKey: "procurement" },
  { href: "/inventory", label: "Inventory Ledger", icon: Warehouse, group: "Operations", moduleKey: "inventory" },
  { href: "/production", label: "Production & Blend Orders", icon: FlaskConical, group: "Operations", moduleKey: "production" },
  { href: "/packaging", label: "Packaging Orders", icon: Package, group: "Operations", moduleKey: "packaging" },
  { href: "/sales", label: "Sales & Invoicing", icon: Receipt, group: "Operations", moduleKey: "sales" },
  { href: "/consignments", label: "Consignments", icon: Truck, group: "Operations", moduleKey: "consignment" },
  { href: "/reports", label: "Reports", icon: BarChart3, group: "Operations", moduleKey: "reports" },
  { href: "/planning", label: "Production Planning", icon: CalendarClock, group: "Operations", moduleKey: "planning" },

  { href: "/admin", label: "Administration", icon: ShieldCheck, group: "Admin", moduleKey: "admin" },
];
