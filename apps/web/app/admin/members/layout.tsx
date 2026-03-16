import { AdminMemberTabs } from "./admin-member-tabs";

export default function AdminMembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <AdminMemberTabs />
      {children}
    </div>
  );
}
