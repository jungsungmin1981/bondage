"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminNoticePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/notice/rigger");
  }, [router]);
  return null;
}
