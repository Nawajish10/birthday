import { readScope } from "@/lib/session";
import { Experience } from "@/components/Experience";
export default async function Page() { return <Experience unlocked={await readScope("birthday")} />; }
