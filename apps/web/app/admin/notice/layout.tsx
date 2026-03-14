import { AdminNoticeTabs } from "./admin-notice-tabs";

export default function AdminNoticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <AdminNoticeTabs />
      {children}
    </div>
  );
}
