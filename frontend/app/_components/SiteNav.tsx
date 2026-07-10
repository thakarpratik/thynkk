import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { BrandLogo } from "./BrandLogo";

export function SiteNav() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-[#1E293B] bg-[#020617]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <BrandLogo priority />
        <div className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
          <Link href="/why-reddit-works" className="hover:text-white transition-colors">Why Reddit Works?</Link>
          <Link href="/case-studies" className="hover:text-white transition-colors">Case studies</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
        </div>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="text-sm text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="text-sm bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-2 rounded-md font-medium transition-colors cursor-pointer">
                Start free
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </nav>
  );
}
