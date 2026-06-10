'use client'

// Sub-navigation for the Equipment & Safety section now lives in the global
// left fly-out rail (see DashboardSideNav). This component is kept as a no-op
// so existing inline usages across pages continue to compile without rendering
// the old horizontal bar.
export default function EquipmentManagementSubNav() {
  return null
}
