"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type PublicNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function PublicNavLink({ href, className, ...props }: PublicNavLinkProps) {
  const isActive = usePathname() === href;

  return (
    <Link
      {...props}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        className,
        isActive && "bg-stone-100 text-charcoal-950 hover:bg-stone-200",
      )}
    />
  );
}
