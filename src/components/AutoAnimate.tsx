"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ComponentPropsWithoutRef, ElementType } from "react";

// SSR-safe wrapper so server components can opt into auto-animate. Drop it in
// place of the container element for a list/card group; children need stable
// React keys. auto-animate respects prefers-reduced-motion by default.
type Props<T extends ElementType> = { as?: T } & ComponentPropsWithoutRef<T>;

export function AutoAnimate<T extends ElementType = "div">({
  as,
  ...props
}: Props<T>) {
  const [ref] = useAutoAnimate();
  const Tag = (as ?? "div") as ElementType;
  return <Tag ref={ref} {...props} />;
}
