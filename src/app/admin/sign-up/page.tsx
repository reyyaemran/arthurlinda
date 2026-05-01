import { redirect } from "next/navigation";

/** Sign-up in the app was removed; old links land on sign-in. */
export default function AdminSignUpRedirectPage() {
  redirect("/admin/login");
}
