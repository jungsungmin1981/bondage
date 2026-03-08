export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-4 md:p-8">
      {/* Dark blue-grey gradient, subtle lighter bottom-right */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/98 to-slate-800" />
      {/* Soft blue glow / reflections */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
      <div className="absolute bottom-0 right-0 h-1/2 w-1/2 bg-[radial-gradient(ellipse_100%_100%_at_100%_100%,rgba(96,165,250,0.08),transparent)]" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
