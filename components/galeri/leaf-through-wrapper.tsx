"use client";

import * as React from "react";
import {
  LeafThrough,
  type LeafThroughHandle,
  type LeafThroughProps,
} from "leafthrough/react";

export interface LeafThroughWrapperProps extends LeafThroughProps {
  magazineRef?: React.RefObject<LeafThroughHandle | null>;
}

/**
 * Wrapper tipis untuk LeafThrough agar ref tetap terhubung bersih
 * saat dimuat lewat next/dynamic({ ssr: false }).
 */
export default function LeafThroughWrapper({
  magazineRef,
  ...props
}: LeafThroughWrapperProps) {
  const internalRef = React.useRef<LeafThroughHandle | null>(null);

  React.useImperativeHandle(
    magazineRef,
    () => ({
      next: () => internalRef.current?.next() ?? false,
      prev: () => internalRef.current?.prev() ?? false,
      goTo: (page, opts) => internalRef.current?.goTo(page, opts),
      get page() {
        return internalRef.current?.page ?? props.startPage ?? 0;
      },
      get pageCount() {
        return internalRef.current?.pageCount ?? props.pages.length;
      },
      get instance() {
        return internalRef.current?.instance ?? null;
      },
    }),
    [props.pages.length, props.startPage]
  );

  return <LeafThrough ref={internalRef} {...props} />;
}
