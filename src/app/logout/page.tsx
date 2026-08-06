"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/services/storage";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    logout().then(() => router.replace("/login"));
  }, [router]);

  return null;
}
