import { notFound, redirect } from "next/navigation";

import { getDefaultMeetingId } from "@/server/queries";

type Props = { params: Promise<{ id: string }> };

/** A bare visit to the Meetings tab lands on the most recently held meeting. */
export default async function MeetingsIndexPage({ params }: Props) {
  const { id } = await params;
  const meetingId = await getDefaultMeetingId(id);
  if (!meetingId) notFound();
  redirect(`/shows/${id}/meetings/${meetingId}`);
}
