import { ReactNode } from 'react';

export default function PublicPagesLayout({ children }: { children: ReactNode }) {
  // This layout wraps all public pages in the (public) route group
  // Individual pages will use PublicLayout component for the actual layout
  return children;
}
