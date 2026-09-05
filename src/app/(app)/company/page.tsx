import type { Metadata } from "next";

import { getOrganizationMembers } from "@/server/queries";
import { requireMembership } from "@/server/auth-guards";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { AddMemberForm } from "./add-member-form";

export const metadata: Metadata = { title: "Company & crew" };

export default async function CompanyPage() {
  const [members, { role }] = await Promise.all([getOrganizationMembers(), requireMembership()]);

  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 640 }}>
      <h1 style={{ fontSize: 28 }}>Company &amp; crew</h1>
      <p className="text-muted" style={{ fontSize: 13, marginBottom: "var(--space-4)" }}>
        Everyone signed in to Callboard for this company.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderTop: "2px solid var(--color-divider)",
        }}
      >
        {members.map((member) => (
          <div
            key={member.userId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) 0",
              borderBottom: "1px solid var(--color-divider)",
            }}
          >
            <Avatar name={member.name ?? member.email} image={member.image} size={30} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14 }}>
                {member.name ?? member.email}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {member.email}
              </div>
            </div>
            <Tag className="tag-neutral">{member.role}</Tag>
          </div>
        ))}
      </div>

      {(role === "owner" || role === "admin") && <AddMemberForm />}
    </div>
  );
}
