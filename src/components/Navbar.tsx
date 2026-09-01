"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const PUBLIC_LINKS = [
  { href: "/", label: "Analizar" },
  { href: "/oportunidades", label: "Ver oportunidades del día" },
  { href: "/demo", label: "Demo" },
];

const SESSION_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/historial", label: "Historial" },
  { href: "/perfil/documentos", label: "Documentos" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/analisis");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const links =
    status === "authenticated"
      ? [...PUBLIC_LINKS, ...SESSION_LINKS]
      : PUBLIC_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="SECOP AI Analyzer — inicio"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold text-white"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            SA
          </span>
          <span className="text-sm font-bold leading-tight text-foreground">
            SECOP AI <span className="text-brand">Analyzer</span>
          </span>
        </Link>

        <ul className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
                      : "rounded-full px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface2 hover:text-foreground"
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          {status === "authenticated" && session ? (
            <>
              <span className="hidden items-center gap-2 text-[11px] text-muted sm:inline-flex">
                {session.user.name}
                <span className="rounded-full border border-border bg-surface2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
                  {session.user.role}
                </span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-border bg-surface2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted transition hover:text-foreground"
              >
                Salir
              </button>
            </>
          ) : status === "unauthenticated" ? (
            <Link
              href="/login"
              className="rounded-full border border-border bg-surface2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted transition hover:text-foreground"
            >
              Iniciar sesión
            </Link>
          ) : (
            <span
              aria-hidden
              className="h-7 w-28 animate-pulse rounded-full bg-surface2"
            />
          )}
        </div>
      </nav>
    </header>
  );
}
