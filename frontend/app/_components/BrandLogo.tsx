import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  className?: string;
  priority?: boolean;
}

/** Wordmark is wide (~4:1). Default height matches old text-xl nav treatment. */
export function BrandLogo({ href = "/", className = "h-11 w-auto sm:h-12", priority = false }: BrandLogoProps) {
  const image = (
    <Image
      src="/thynkk-logo.png"
      alt="Thynkk"
      width={216}
      height={56}
      className={className}
      sizes="(max-width: 640px) 190px, 216px"
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