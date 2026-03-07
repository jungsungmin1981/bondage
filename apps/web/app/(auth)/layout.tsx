import Link from "next/link";
import { AuthHero } from "@/components/auth-hero";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-svh lg:grid-cols-2">
      {/* Left: space theme background + branding */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1a0b2e] via-[#16213e] to-[#0f3460] p-8 md:p-12">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/4 top-0 h-[80vh] w-[80vh] rounded-full bg-[#4a1d96]/30 blur-[100px]" />
          <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-[#0ea5e9]/20 blur-[80px]" />
          <div className="absolute bottom-1/4 left-1/3 h-32 w-32 rounded-full bg-[#a855f7]/20 blur-[60px]" />
          {/* Stars */}
          <div className="absolute left-[10%] top-[20%] h-1 w-1 rounded-full bg-white/80" />
          <div className="absolute left-[25%] top-[35%] h-0.5 w-0.5 rounded-full bg-white/60" />
          <div className="absolute left-[15%] top-[50%] h-1 w-1 rounded-full bg-white/70" />
          <div className="absolute left-[30%] top-[60%] h-0.5 w-0.5 rounded-full bg-white/50" />
          <div className="absolute right-[20%] top-[15%] h-1 w-1 rounded-full bg-white/80" />
          <div className="absolute right-[35%] top-[45%] h-0.5 w-0.5 rounded-full bg-white/60" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-medium text-white">
            <div className="flex size-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
              <span className="text-xl font-bold">M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight">Ibrahim</span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">Memon</span>
            </div>
          </Link>
        </div>

        <AuthHero />
      </div>

      {/* Right: form area */}
      <div className="flex flex-col justify-center bg-[#0d0d1a] p-8 md:p-12 lg:p-16">
        <div className="w-full max-w-sm mx-auto">{children}</div>
      </div>
    </div>
  );
}
