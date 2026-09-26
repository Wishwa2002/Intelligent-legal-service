import psycopg2
import json

DB_URL = "postgresql://neondb_owner:npg_ZYig0C9jhOHo@ep-late-heart-ay0bwalp.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'DocumentationServices'
        ORDER BY ordinal_position;
    """)
    cols = cur.fetchall()
    print("Table columns:")
    for c in cols:
        print(" ", c)

    col_names = [c[0] for c in cols]

    # Fix sequence
    cur.execute("""SELECT pg_get_serial_sequence('"DocumentationServices"', 'ServiceId');""")
    seq = cur.fetchone()[0]
    print(f"Sequence: {seq}")

    new_services = [
        (
            "Power of Attorney",
            "Legal authorization granting an appointed agent or attorney full power to act on your behalf.",
            True,
            json.dumps(["Principal NIC", "Attorney NIC", "Power of Attorney Draft"])
        ),
        (
            "Last Will and Testament",
            "Drafting, attestation, and official registry documentation of a last will and testament.",
            True,
            json.dumps(["Testator NIC", "Draft Will Agreement", "Asset Ownership Proof"])
        ),
        (
            "Commercial Lease Agreement",
            "Commercial property lease registration, rental covenant drafting, and formal attestation.",
            True,
            json.dumps(["Landlord NIC", "Tenancy Agreement", "Property Deed Copy"])
        )
    ]

    for name, desc, active, req_docs in new_services:
        cur.execute('SELECT "ServiceId" FROM "DocumentationServices" WHERE LOWER("Name") = LOWER(%s);', (name,))
        existing = cur.fetchone()
        if existing:
            print(f"Service '{name}' already exists (ID: {existing[0]}). Updating...")
            cur.execute("""
                UPDATE "DocumentationServices"
                SET "Description" = %s, "IsActive" = %s, "RequiredDocuments" = %s
                WHERE "ServiceId" = %s;
            """, (desc, active, req_docs, existing[0]))
        else:
            fields = ['"Name"', '"Description"', '"IsActive"', '"RequiredDocuments"']
            vals = [name, desc, active, req_docs]
            placeholders = ["%s", "%s", "%s", "%s"]

            if "CreatedAt" in col_names:
                fields.append('"CreatedAt"')
                placeholders.append("NOW()")
            if "UpdatedAt" in col_names:
                fields.append('"UpdatedAt"')
                placeholders.append("NOW()")

            sql = f"""
                INSERT INTO "DocumentationServices" ({", ".join(fields)})
                VALUES ({", ".join(placeholders)})
                RETURNING "ServiceId";
            """
            cur.execute(sql, vals)
            new_id = cur.fetchone()[0]
            print(f"Inserted '{name}' with ServiceId={new_id}")

    conn.commit()

    if seq:
        cur.execute(f'SELECT setval(\'{seq}\', (SELECT COALESCE(MAX("ServiceId"), 1) FROM "DocumentationServices"));')
        conn.commit()

    cur.execute('SELECT "ServiceId", "Name", "IsActive", "RequiredDocuments" FROM "DocumentationServices" ORDER BY "ServiceId";')
    print("\nAll services now in database:")
    for r in cur.fetchall():
        print(f"  #{r[0]}: {r[1]} (Active: {r[2]}) -> {r[3]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
