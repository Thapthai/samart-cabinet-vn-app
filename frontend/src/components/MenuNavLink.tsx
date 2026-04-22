'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export type MenuNavLinkProps = {
  href: string;
  /** ถ้ามีค่า: ใช้ `<a>` แบบ URL เต็ม + แท็บใหม่ (ไม่ผ่าน basePath ของ Next) */
  externalHref?: string;
  className?: string;
  onClick?: () => void;
  title?: string;
  'aria-label'?: string;
  children: ReactNode;
};

/** ลิงก์ Sidebar — ภายในใช้ next/link; ภายนอกใช้ `<a target="_blank">` */
export function MenuNavLink({
  href,
  externalHref,
  className,
  onClick,
  title,
  'aria-label': ariaLabel,
  children,
}: MenuNavLinkProps) {
  const ext = (externalHref ?? '').trim();
  if (ext) {
    return (
      <a
        href={ext}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick} title={title} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
