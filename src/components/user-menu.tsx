"use client";

import type { User } from "@supabase/supabase-js";
import { ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.35 11.1h-9.17v2.98h5.28c-.23 1.5-1.66 4.4-5.28 4.4-3.18 0-5.78-2.63-5.78-5.88s2.6-5.88 5.78-5.88c1.81 0 3.02.77 3.71 1.44l2.53-2.44C17.02 3.7 14.87 2.8 12.18 2.8 7.03 2.8 2.86 6.97 2.86 12.6s4.17 9.8 9.32 9.8c5.38 0 8.94-3.78 8.94-9.1 0-.61-.07-1.08-.17-1.55z" />
    </svg>
  );
}

function initialsOf(user: User): string {
  const name = (user.user_metadata.full_name as string | undefined) ?? user.email ?? "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setMenuOpen(false);
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="yk-gradient hidden items-center gap-[9px] rounded-[11px] px-4 py-2.5 text-[13.5px] font-bold md:inline-flex"
      >
        <GoogleGlyph />
        {t("signIn")}
      </Link>
    );
  }

  const avatarUrl = user.user_metadata.avatar_url as string | undefined;
  const fullName = (user.user_metadata.full_name as string | undefined) ?? "";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={t("account")}
        aria-expanded={menuOpen}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-edge bg-surface-3 py-1 pl-1 pr-1.5"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={30} height={30} className="rounded-full" />
        ) : (
          <span className="yk-gradient grid size-[30px] place-items-center rounded-full text-[13px] font-extrabold">
            {initialsOf(user)}
          </span>
        )}
        <ChevronDown size={15} strokeWidth={2} className="text-sub" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-[46px] z-40 w-[220px] overflow-hidden rounded-[14px] border border-edge-2 bg-surface shadow-[0_18px_44px_rgba(0,0,0,0.6)]">
            <div className="border-b border-edge px-4 py-3.5">
              <div className="truncate text-sm font-bold">{fullName}</div>
              <div className="truncate text-xs text-tert">{user.email}</div>
            </div>
            <div className="p-1.5">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] hover:bg-edge"
              >
                <LogOut size={16} strokeWidth={2} />
                {t("signOut")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
