"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, Package, History, Building2, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [operadorNome, setOperadorNome] = useState<string>("");

  useEffect(() => {
    const nome = localStorage.getItem("operadorNome");
    if (nome) {
      setOperadorNome(nome);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("operadorId");
    localStorage.removeItem("operadorNome");
    router.push("/");
  };

  if (pathname === "/") return null;

  const navItems = [
    { href: "/produtos", label: "Produtos", icon: Package },
    { href: "/historico", label: "Histórico", icon: History },
    { href: "/empresa", label: "Empresa", icon: Building2 },
  ];

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">PDV Sistema</h1>
            <div className="hidden md:flex space-x-1">
              {/* Botão Carrinho/Caixa com destaque */}
              <Link
                href="/caixa"
                className={`flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all shadow-lg font-semibold ${
                  pathname === "/caixa" ? "ring-2 ring-white/50" : ""
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Caixa</span>
              </Link>
              
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-white/20 shadow-md"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-lg">
              <User className="w-5 h-5" />
              <span className="font-medium">{operadorNome}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4 flex space-x-2 overflow-x-auto">
          {/* Botão Carrinho/Caixa Mobile */}
          <Link
            href="/caixa"
            className={`flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all shadow-lg font-semibold whitespace-nowrap ${
              pathname === "/caixa" ? "ring-2 ring-white/50" : ""
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Caixa</span>
          </Link>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-white/20 shadow-md"
                    : "hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}