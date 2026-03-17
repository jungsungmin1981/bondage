import { AdminClassSectionTabs } from "../admin-class-section-tabs";
import { AdminClassTabs } from "./admin-class-tabs";

export default function AdminClassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <AdminClassSectionTabs />
      <AdminClassTabs />
      {children}
    </div>
  );
}
