import { ClientAppChrome } from "@/components/ClientAppChrome";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientAppChrome>{children}</ClientAppChrome>;
}
