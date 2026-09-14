import psycopg2

conn = psycopg2.connect("postgresql://neondb_owner:npg_ZYig0C9jhOHo@ep-late-heart-ay0bwalp.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

# Remove the test 'string' row if it exists
cur.execute("DELETE FROM \"Careers\" WHERE \"JobTitle\" = 'string';")

careers_data = [
    (
        "Senior Corporate & Commercial Counsel",
        "Lead corporate compliance, complex mergers & acquisitions, and commercial contract negotiations. Candidates must have an LL.B., Attorney-at-Law qualification with 5+ years of corporate advisory experience."
    ),
    (
        "Legal Operations & Documentation Clerk",
        "Audit customer-uploaded legal documents, verify certified affidavits, tenancy agreements, and powers of attorney, and liaise with attorneys to ensure swift case readiness. Experience with legal filing required."
    ),
    (
        "Litigation & Dispute Resolution Associate",
        "Draft pleadings, affidavits, and appellate briefs for civil and criminal court representation. Attend court hearings and work closely with senior legal counsel on high-stakes litigation cases."
    ),
    (
        "AI Legal Intelligence & Prompt Engineer",
        "Design and evaluate legal domain prompt chains, contract validation graphs, and document OCR extraction pipelines using LangGraph and generative AI for our intelligent legal automation platform."
    )
]

for title, desc in careers_data:
    cur.execute('SELECT "CareerId" FROM "Careers" WHERE "JobTitle" = %s;', (title,))
    row = cur.fetchone()
    if not row:
        cur.execute(
            'INSERT INTO "Careers" ("JobTitle", "Description", "CreatedAt", "UpdatedAt") VALUES (%s, %s, NOW(), NOW()) RETURNING "CareerId";',
            (title, desc)
        )
        print(f"Inserted: {title} (ID: {cur.fetchone()[0]})")
    else:
        cur.execute(
            'UPDATE "Careers" SET "Description" = %s, "UpdatedAt" = NOW() WHERE "CareerId" = %s;',
            (desc, row[0])
        )
        print(f"Updated: {title} (ID: {row[0]})")

conn.commit()
cur.execute('SELECT "CareerId", "JobTitle", "Description" FROM "Careers";')
print("Current Careers in DB:", cur.fetchall())
cur.close()
conn.close()
