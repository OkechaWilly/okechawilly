import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Fill the (relatively positioned) parent. Otherwise the image keeps its natural shape. */
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
};

/**
 * Images in Supabase are already resized during upload. Bypass the extra
 * Next.js image proxy so pages can request the stored asset directly.
 * External editor-provided URLs remain ordinary responsive images as well.
 */
export function RemoteImage({ src, alt, className = "", fill = false, sizes, priority = false }: Props) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className={className}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}
