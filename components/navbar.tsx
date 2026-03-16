import { auth } from "@/auth";
import { NavbarContent } from "./navbar-content";

export async function Navbar() {
  const session = await auth();

  return <NavbarContent session={session} />;
}
