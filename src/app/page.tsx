import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/server/auth-guards";

/** The app has no marketing surface yet; route by session instead. */
export default async function Home() {
  const userId = await getCurrentUserId();
  redirect(userId ? "/projects" : "/login");
}
