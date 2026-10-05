"""
app/retrieval/corpus.py

Knowledge base of official Sri Lankan legal service document requirements,
checklists, and statutory verification guidelines for hybrid retrieval.
"""

from typing import TypedDict


class LegalKnowledgeDoc(TypedDict):
    id: str
    title: str
    service_type: str
    category: str
    content: str
    required_documents: list[str]


LEGAL_KNOWLEDGE_CORPUS: list[LegalKnowledgeDoc] = [
    {
        "id": "DOC-REQ-PROP-TRANSFER",
        "title": "Property Transfer & Conveyancing Document Checklist",
        "service_type": "PROPERTY_TRANSFER",
        "category": "Property Law",
        "content": (
            "Official checklist for Land and Property Transfer (Deed of Transfer / Conveyance) in Sri Lanka: "
            "1. National Identity Card (NIC) or valid Passport of Transferor and Transferee for identity verification. "
            "2. Prior Title Deed (Original or certified extract from the Land Registry) proving clear title and pedigree. "
            "3. Certified Survey Plan drawn by a licensed surveyor and approved by the local authority. "
            "4. Sale Agreement (Agreement to Sell) detailing purchase consideration, covenants, and terms. "
            "5. Local Authority Non-Vesting Certificate, Street Line Certificate, and Ownership Certificate (Extract). "
            "6. Completed Property Transfer Application Form signed by both parties."
        ),
        "required_documents": [
            "NIC",
            "PROPERTY_DEED",
            "SALE_AGREEMENT",
            "APPLICATION_FORM",
        ],
    },
    {
        "id": "DOC-REQ-RENTAL-LEASE",
        "title": "Rental & Lease Agreement Documentation Requirements",
        "service_type": "RENTAL_LEASE_AGREEMENT",
        "category": "Tenancy Law",
        "content": (
            "Required statutory documents for drafting and executing Tenancy & Lease Agreements: "
            "1. National Identity Card (NIC) or valid passport of Landlord (Lessor) and Tenant (Lessee). "
            "2. Proof of Property Ownership (Title Deed or Local Council Assessment Tax receipt in lessor's name). "
            "3. Tenancy/Lease Agreement Draft specifying monthly rental, refundable security deposit, tenure, and maintenance obligations. "
            "4. Identity proof and contact information of two independent witnesses."
        ),
        "required_documents": [
            "NIC",
            "PROPERTY_DEED",
            "CONTRACT",
        ],
    },
    {
        "id": "DOC-REQ-BIZ-REG",
        "title": "Business & Corporate Registration Statutory Requirements",
        "service_type": "BUSINESS_REGISTRATION",
        "category": "Corporate Law",
        "content": (
            "Statutory documentation required for Sole Proprietorship, Partnership, and Private Limited Company (Pvt Ltd) under Companies Act No. 07 of 2007: "
            "1. National Identity Card (NIC) copies of all Directors, Shareholders, or Partners. "
            "2. Business Registration Application Form (Form 1, Form 18, Form 19 for incorporation). "
            "3. Articles of Association or Partnership Agreement detailing capital contributions and profit sharing. "
            "4. Proof of Registered Office Address (Utility bill or premises consent letter). "
            "5. Name Approval Confirmation certificate from the Department of Registrar of Companies (ROC)."
        ),
        "required_documents": [
            "NIC",
            "BUSINESS_REGISTRATION",
            "APPLICATION_FORM",
            "CONTRACT",
        ],
    },
    {
        "id": "DOC-REQ-POA",
        "title": "Power of Attorney Execution & Attestation Checklist",
        "service_type": "POWER_OF_ATTORNEY",
        "category": "Notarial Practice",
        "content": (
            "Mandatory documents for executing General and Special Powers of Attorney under the Powers of Attorney Ordinance: "
            "1. National Identity Card (NIC) or Valid Passport copy of the Principal (Grantor) and the Attorney (Proxy). "
            "2. Power of Attorney Draft specifying explicit powers granted, limitations, and revocation clauses. "
            "3. Supporting property or business documents if power involves land disposal or litigation. "
            "4. Notarial Attestation requirement: Executed in the presence of an Attorney-at-Law / Notary Public and two attesting witnesses."
        ),
        "required_documents": [
            "NIC",
            "APPLICATION_FORM",
            "CONTRACT",
        ],
    },
    {
        "id": "DOC-REQ-WILL-TESTAMENT",
        "title": "Last Will & Testament Drafting & Execution Requirements",
        "service_type": "WILL_TESTAMENT",
        "category": "Probate & Succession",
        "content": (
            "Statutory prerequisites for drafting and attesting a Last Will and Testament: "
            "1. National Identity Card (NIC) of Testator confirming legal age and testamentary capacity. "
            "2. Complete schedule of assets, including Title Deeds for real property and bank/vehicle registration details. "
            "3. Details of Nominated Executor(s) and Beneficiaries. "
            "4. Draft Will Agreement detailing specific bequests, residuary clauses, and revocation of prior wills. "
            "5. Attestation requirement: Signed before a Notary Public and two independent witnesses present simultaneously."
        ),
        "required_documents": [
            "NIC",
            "PROPERTY_DEED",
            "CONTRACT",
        ],
    },
    {
        "id": "DOC-REQ-BAIL-CRIMINAL",
        "title": "Bail Application & Criminal Representation Documentation",
        "service_type": "BAIL_APPLICATION",
        "category": "Criminal Law",
        "content": (
            "Statutory documentation required for Court Bail Applications under the Bail Act No. 30 of 1997: "
            "1. National Identity Card (NIC) of the Accused and Proposed Sureties. "
            '2. Police "B" Report or Case Information Sheet from the relevant Magistrate\'s Court. '
            "3. Affidavit of Sureties confirming domicile, relationship, and financial standing. "
            "4. Proof of Surety Assets (Land deed, salary slips, or fixed deposit certificates). "
            "5. Medical reports or special grounds certificates if requesting bail on medical or humanitarian grounds."
        ),
        "required_documents": [
            "NIC",
            "COURT_DOCUMENT",
            "APPLICATION_FORM",
        ],
    },
    {
        "id": "DOC-REQ-AFFIDAVIT",
        "title": "Statutory Affidavit & Declaration Documentation",
        "service_type": "AFFIDAVIT_DECLARATION",
        "category": "Notarial Practice",
        "content": (
            "Statutory prerequisites for executing a Sworn Affidavit / Declaration of Fact: "
            "1. National Identity Card (NIC) of the Deponent for identity verification. "
            "2. Completed Affidavit Draft specifying clear, numbered factual averments affirmed on oath. "
            "3. Supporting documentary exhibits referenced in the averments (e.g. Birth Certificate, Police Report). "
            "4. Attestation by a Justice of the Peace (JP) or Commissioner for Oaths."
        ),
        "required_documents": [
            "NIC",
            "APPLICATION_FORM",
        ],
    },
]
