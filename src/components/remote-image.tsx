import Image from "next/image";
import { isSupabaseImage } from "@/lib/images";

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
 * For images whose address is typed or pasted by an editor (journal covers and
 * inline pictures). Our own storage images are optimised by next/image; images
 * from any other website cannot be, so they are shown as ordinary lazy images
 * instead of failing.
 */
export function RemoteImage({ src, alt, className = "", fill = false, sizes, priority = false }: Props) {
  if (isSupabaseImage(src)) {
    return fill ? (
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />
    ) : (
      <Image src={src} alt={alt} width={0} height={0} sizes={sizes ?? "100vw"} priority={priority} className={className} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
    />
  );
}
