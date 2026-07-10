import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ href = "/", className = "h-8 w-auto", priority = false }: BrandLogoProps) {
  const image = (
    <Image
      src="/thynkk-logo.png"
      alt="Thynkk"
      width={80}
      height={40}
      className={className}
      priority={priority}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {image}
    </Link>
  );
}