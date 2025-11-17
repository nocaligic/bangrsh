"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { MintUSDCButton } from "./MintUSDCButton";
import { Button } from "./ui/button";
import { useWallet } from "@/contexts/WalletContext";

interface HeaderProps {
  onCreateClick?: () => void;
}

export function Header({ onCreateClick }: HeaderProps) {
  const { isConnected, address, balance, connect } = useWallet();

  return (
    <header className="w-full">
      <div className="grid grid-cols-1 gap-4 items-center md:grid-cols-[auto,1fr,auto]">
        {/* Logo Block */}
        <div className="bg-pink-500 nb-border nb-shadow p-4 flex justify-center items-center h-full">
          <h1 className="text-4xl font-black text-white text-shadow-black">
            BANGR
          </h1>
        </div>

        {/* Search Block */}
        <div className="relative w-full h-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 w-5 h-5 z-10" />
          <Input
            type="text"
            placeholder="Search markets..."
            className="w-full p-3 h-full nb-border nb-shadow bg-white font-medium text-black placeholder-neutral-600 focus:outline-none text-lg pl-12"
          />
        </div>
        {/* Header Actions */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          {isConnected ? (
            <>
              {/* Connected State */}
              <div className="nb-border nb-shadow bg-white px-3 py-2 text-center">
                <div className="text-[10px] text-neutral-600 font-semibold">BALANCE</div>
                <div className="font-bold text-sm">${balance.toFixed(2)}</div>
              </div>

              {address && (
                <div className="nb-border nb-shadow bg-blue-400 text-white px-3 py-2 font-mono text-xs text-center">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              )}

              <Link href="/portfolio">
                <Button className="nb-button bg-purple-500 text-white px-4 py-3 text-sm md:text-base whitespace-nowrap font-pixel uppercase">
                  Portfolio
                </Button>
              </Link>

              {onCreateClick && (
                <Button
                  onClick={onCreateClick}
                  className="nb-button bg-yellow-400 text-black px-4 py-3 text-sm md:text-base whitespace-nowrap"
                >
                  + Create
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={connect}
                className="nb-button bg-blue-500 text-white px-4 py-3 text-sm md:text-base whitespace-nowrap"
              >
                Connect Wallet
              </Button>

              {onCreateClick && (
                <Button
                  onClick={onCreateClick}
                  className="nb-button bg-yellow-400 text-black px-4 py-3 text-sm md:text-base whitespace-nowrap"
                >
                  + Create
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
