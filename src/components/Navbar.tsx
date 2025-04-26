"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

export default function Navbar() {
  const { user, loading } = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const logout = async () => {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  const isConfirmed = Boolean(user?.email_confirmed_at);
  const navItems: Array<{ label: string; href: string }> = [
    { label: "Inicio", href: "/" },
    { label: "Retos", href: "/retos" },
    { label: "Historial", href: "/historial" },
    { label: "Perfil", href: "/perfil" },
  ];

  const renderLink = (label: string, href: string) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`px-3 py-2 rounded-md text-base font-medium transition ${
          active
            ? "text-white bg-green-600"
            : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        {label}
      </Link>
    );
  };

  // Skeleton mientras carga
  if (loading) {
    return (
      <nav
        aria-label="Menú principal"
        className="p-4 bg-white dark:bg-gray-800 border-b"
      >
        <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Menú principal"
      className="bg-white dark:bg-gray-800 border-b shadow-md p-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold text-green-600 dark:text-green-400"
        >
          CodeQuest
        </Link>

        {/* Menú escritorio */}
        <div className="hidden sm:flex items-center space-x-4">
          {!user || !isConfirmed ? (
            <Link
              href="/login"
              className="text-base font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Iniciar Sesión
            </Link>
          ) : (
            <>
              {navItems.map((item) => renderLink(item.label, item.href))}
              <button
                onClick={logout}
                className="px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Cerrar Sesión
              </button>
            </>
          )}
        </div>

        {/* Botón móvil */}
        <div className="sm:hidden flex items-center">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {menuOpen ? "✖️" : "☰"}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <div className="sm:hidden mt-2 space-y-1">
          {!user || !isConfirmed ? (
            <Link
              href="/login"
              className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Iniciar Sesión
            </Link>
          ) : (
            <>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={logout}
                className="block w-full text-left px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
