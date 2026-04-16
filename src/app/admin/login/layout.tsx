export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page renders full-screen centered form — no sidebar needed.
  // This layout overrides the parent admin layout's flex container.
  return <div className="fixed inset-0 z-50">{children}</div>;
}
