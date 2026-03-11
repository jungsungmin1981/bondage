import { AdminImageTabs } from "./admin-image-tabs";

export default function AdminImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <AdminImageTabs />
      {children}
    </div>
  );
}
