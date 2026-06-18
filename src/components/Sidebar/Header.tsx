"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaHome, FaCubes, FaTruck, FaTrailer, FaEnvelope, FaFileAlt } from "react-icons/fa";

export default function Header() {
  const pathname = usePathname();
  const isViewer = pathname.startsWith("/vehiculo");

  const navItems = [
    { href: "/", label: "Inicio", icon: FaHome },
    { href: "/", label: "Soluciones", icon: FaCubes },
    { href: "/vehiculo/transporte-carga", label: "Tracto Camión", icon: FaTruck },
    { href: "/vehiculo/activos-sin-motor", label: "Remolques", icon: FaTrailer },
    { href: "#contacto", label: "Contacto", icon: FaEnvelope },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-2.5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/assets/images/directrack-logo.png"
            alt="DirectTrack — Control Vehicular y Personal"
            width={200}
            height={56}
            className="h-11 w-auto object-contain sm:h-12"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isViewer && item.label === "Tracto Camión";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "text-[#1e88e5] after:mt-0.5 after:block after:h-0.5 after:w-full after:rounded-full after:bg-[#1e88e5]"
                    : "text-gray-500 hover:text-[#1a3a5c]"
                }`}
              >
                <Icon className="text-base" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-[#1e88e5] px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#1565c0] sm:text-sm"
        >
          <FaFileAlt />
          <span className="hidden sm:inline">Solicitar Cotización</span>
        </button>
      </div>
    </header>
  );
}
