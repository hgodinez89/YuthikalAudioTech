import Image from "next/image";

const HEIGHT = 42;

/**
 * Logo por tema (handoff): crop sobre negro en oscuro, versión clara con
 * fondo transparente en claro. Ambos se renderizan y el tema activo decide
 * cuál se ve, evitando desajustes de hidratación.
 */
export function BrandLogo({ height = HEIGHT }: { height?: number }) {
  return (
    <>
      <Image
        src="/brand/yuthikal-logo-crop.png"
        alt="Yuthikal AudioTech"
        width={Math.round((1137 / 608) * height)}
        height={height}
        priority
        className="hidden dark:block"
      />
      <Image
        src="/brand/yuthikal-logo-claro.png"
        alt="Yuthikal AudioTech"
        width={Math.round((1060 / 567) * height)}
        height={height}
        priority
        className="dark:hidden"
      />
    </>
  );
}
