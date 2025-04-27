"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

export default function Navbar() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);

  const loading = authLoading || checkingAdmin;

  useEffect(() => {
    setIsAdmin(false);
    setCheckingAdmin(true);

    if (authLoading) {
      return;
    }

    if (!user) {
      setCheckingAdmin(false);
      return;
    }

    async function checkAdminStatus() {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("public_user_profiles")
          .select("is_admin")
          .eq("id", user!.id)
          .single();

        if (profileError) {
          console.error("Navbar: Error checking admin status:", profileError);
          setIsAdmin(false);
        } else if (profile && profile.is_admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err: unknown) {
        console.error("Navbar: Unexpected error checking admin status:", err);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    }

    checkAdminStatus();
  }, [user, authLoading]);

  const logout = async () => {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
      await supabase.auth.signOut();
      setIsAdmin(false);
      router.push("/login");
    }
  };

  const isConfirmed = Boolean(user?.email_confirmed_at);

  const baseNavItems: Array<{ label: string; href: string }> = [
    { label: "Inicio", href: "/" },
    { label: "Retos", href: "/retos" },
    { label: "Historial", href: "/historial" },
    { label: "Perfil", href: "/perfil" },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { label: "Admin", href: "/admin" }]
    : baseNavItems;

  const renderLink = (label: string, href: string) => {
    const active =
      pathname === href || (href === "/admin" && pathname.startsWith("/admin"));
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMenuOpen(false)}
        className={`px-3 py-2 rounded-md text-base font-medium transition ${
          active
            ? "text-white bg-green-600 dark:bg-green-700"
            : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        {label}
      </Link>
    );
  };

  if (loading) {
    return (
      <nav
        aria-label="Menú principal"
        className="p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="hidden sm:flex items-center space-x-4">
            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Menú principal"
      className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-md p-4 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold text-green-600 dark:text-green-400"
        >
          CodeQuest
        </Link>

        <div className="hidden sm:flex items-center space-x-1">
          {!user || !isConfirmed ? (
            <Link
              href="/login"
              className="px-3 py-2 rounded-md text-base font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Iniciar Sesión
            </Link>
          ) : (
            <>
              {navItems.map((item) => renderLink(item.label, item.href))}
              <button
                onClick={logout}
                className="px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700"
              >
                Cerrar Sesión
              </button>
            </>
          )}
        </div>

        <div className="sm:hidden flex items-center">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="p-2 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {menuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden mt-2 space-y-1 border-t pt-2 dark:border-gray-700">
          {!user || !isConfirmed ? (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Iniciar Sesión
            </Link>
          ) : (
            <>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition ${
                    pathname === item.href ||
                    (item.href === "/admin" && pathname.startsWith("/admin"))
                      ? "text-white bg-green-600 dark:bg-green-700"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cerrar Sesión
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
