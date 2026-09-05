import { notFound, redirect } from "next/navigation";

import { getShowDepartments } from "@/server/queries";
import { slugify } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

/** A bare visit to the Departments tab lands on the first department. */
export default async function DepartmentsIndexPage({ params }: Props) {
  const { id } = await params;
  const { departments } = await getShowDepartments(id);
  const first = departments[0];
  if (!first) notFound();
  redirect(`/shows/${id}/departments/${slugify(first.name)}`);
}
