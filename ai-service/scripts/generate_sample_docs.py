"""
Script to generate realistic, professional legal sample documents in both PDF and PNG formats.
These documents contain authentic legal formatting, headers, stamps, and structured details
designed to be reliably accepted by the AI document validation agent.
"""

import os
import fitz  # PyMuPDF

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_documents")
os.makedirs(DOCS_DIR, exist_ok=True)

def create_styled_page(doc, title: str, subtitle: str, border_color=(0.1, 0.2, 0.45)):
    page = doc.new_page(width=595, height=842)  # Standard A4
    # Border
    page.draw_rect(fitz.Rect(25, 25, 570, 817), color=border_color, width=1.5)
    page.draw_rect(fitz.Rect(28, 28, 567, 814), color=border_color, width=0.5)

    # Header title
    page.insert_text((45, 65), title.upper(), fontsize=13, fontname="helv", color=border_color)
    page.insert_text((45, 82), subtitle, fontsize=8.5, fontname="helv", color=(0.35, 0.35, 0.35))
    page.draw_line(fitz.Point(45, 92), fitz.Point(550, 92), color=border_color, width=1)
    return page

def save_doc_artifacts(doc, base_name: str):
    pdf_path = os.path.join(DOCS_DIR, f"{base_name}.pdf")
    doc.save(pdf_path)
    
    # Also render high-res PNG image
    page = doc[0]
    pix = page.get_pixmap(dpi=150)
    png_path = os.path.join(DOCS_DIR, f"{base_name}.png")
    pix.save(png_path)
    doc.close()
    print(f"Generated: {pdf_path} and {png_path}")
    return pdf_path, png_path


def generate_original_contract():
    doc = fitz.open()
    page = create_styled_page(doc, "Original Contract of Sale and Property Transfer", "Deed No: TR-2024-98421 | Land Registry Reference: LRD/WP/45091")
    
    body = (
        "THIS DEED OF TRANSFER AND ORIGINAL CONTRACT is made and entered into on this 15th day of January 2024.\n\n"
        "PARTIES TO THE CONTRACT:\n"
        "1. THE VENDOR: Mr. Alexander Vance, holder of National Identity Card No. 198512345678, residing at No. 42, Lotus Grove, Colombo 07.\n"
        "2. THE PURCHASER: Ms. Sophia Elena Sterling, holder of National Identity Card No. 199298765432, residing at No. 18, Palm Avenue, Kandy.\n\n"
        "SCHEDULE OF PROPERTY:\n"
        "All that defined allotment of land marked Lot 4B in Plan No. 8920, containing in extent 25.4 Perches, situated at Colombo Municipal Council Ward 07, Western Province.\n\n"
        "TERMS & CONDITIONS:\n"
        "1. CONSIDERATION: The Purchaser has paid to the Vendor the full sum of LKR 45,000,000 (Forty-Five Million Sri Lankan Rupees), receipt whereof is hereby acknowledged.\n"
        "2. TRANSFER OF ABSOLUTE TITLE: The Vendor does hereby grant, convey, assign, transfer, and set over unto the Purchaser the aforesaid Property with vacant possession.\n"
        "3. COVENANT OF WARRANTY: The Vendor covenants that the said property is free from all mortgages, leases, lis pendens, encumbrances, and adverse claims.\n"
        "4. GOVERNING LAW: Governed by the Registration of Documents Ordinance and laws of Sri Lanka.\n\n"
        "IN WITNESS WHEREOF the Vendor and Purchaser have placed their respective signatures:\n\n"
        "Vendor:  [Signed: Alexander Vance]                          Date: 15/01/2024\n"
        "Purchaser:  [Signed: Sophia Elena Sterling]                 Date: 15/01/2024\n\n"
        "ATTESTATION BY NOTARY PUBLIC:\n"
        "I, David M. Rathnayake, Notary Public for Western Province, do hereby attest and certify that the above Original Contract was executed in my presence.\n"
        "Seal & Signature: [David M. Rathnayake - Notary Public, Western Province - Registration #NP-44210]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=9.5, fontname="helv")
    return save_doc_artifacts(doc, "Original_Contract")


def generate_amendment_request_letter():
    doc = fitz.open()
    page = create_styled_page(doc, "Official Amendment Request Letter", "Ref No: ARL/2024/09-881 | Date of Submission: September 5, 2026")

    body = (
        "Date: September 5, 2026\n"
        "To: The Registrar of Lands & Legal Conveyancing Department\n"
        "Subject: Formal Amendment Request Letter for Property Transfer Application (Ref: TR-2024-98421)\n\n"
        "Dear Sir/Madam,\n\n"
        "I, Sophia Elena Sterling (NIC No: 199298765432), the registered applicant and purchaser in the Property Transfer "
        "docket No. TR-2024-98421, hereby submit this formal Amendment Request Letter to request an official amendment "
        "to the schedule details of the application.\n\n"
        "NATURE OF REQUESTED AMENDMENT:\n"
        "1. Clerical Rectification: Amendment of the municipal assessment sub-lot number in Schedule B from 'Lot 4A-Old' to 'Lot 4B' "
        "as per the finalized Surveyor General Plan No. 8920.\n"
        "2. Address Verification: Updating applicant correspondence address to No. 18, Palm Avenue, Kandy.\n\n"
        "SUPPORTING PARTICULARS:\n"
        "- Original Contract Reference: Deed No. TR-2024-98421\n"
        "- Attached Documents: Certified copy of Revised Survey Plan and Notarial Certificate of Confirmation.\n\n"
        "I affirm that this amendment is made bona fide and does not alter the underlying consideration or boundary extents.\n\n"
        "Yours faithfully,\n\n"
        "[Signed: Sophia Elena Sterling]\n"
        "Sophia Elena Sterling\n"
        "Applicant & Transferee\n"
        "Contact: +94 77 987 6543 | Email: sophia.sterling@example.com"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=10, fontname="helv")
    return save_doc_artifacts(doc, "Amendment_Request_Letter")


def generate_nic_copy():
    doc = fitz.open()
    page = create_styled_page(doc, "Certified National Identity Card (NIC) Copy", "Democratic Socialist Republic of Sri Lanka - Department of Registration of Persons")

    body = (
        "CERTIFIED COPY OF NATIONAL IDENTITY CARD (NIC)\n\n"
        "CARD DETAILS:\n"
        "--------------------------------------------------------------------------------------------------------\n"
        "NIC Number: 199298765432\n"
        "Full Name: Sophia Elena Sterling\n"
        "Date of Birth: 1992-05-14\n"
        "Sex / Gender: Female\n"
        "Place of Birth: Colombo, Sri Lanka\n"
        "Permanent Address: No. 18, Palm Avenue, Kandy, Sri Lanka\n"
        "Nationality: Sri Lankan\n"
        "Date of Issue: 2018-06-20\n"
        "--------------------------------------------------------------------------------------------------------\n\n"
        "SECURITY & BARCODE VERIFICATION:\n"
        "[EMBEDDED DIGITAL BIOMETRIC CHIP & HOLOGRAPHIC SEAL VERIFIED]\n"
        "Card Status: Active and Legally Valid Government Identification\n\n"
        "JUSTICE OF PEACE / COMMISSIONER CERTIFICATION:\n"
        "I hereby certify that this is a true and accurate copy of the original National Identity Card produced "
        "before me by the cardholder.\n\n"
        "Attested by: K. M. Wickramasinghe, Justice of the Peace (All Island)\n"
        "Registration No: JP/AI/2012/8891\n"
        "Signature & Stamp: [SEAL AFFIXED - K. M. WICKRAMASINGHE JP]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=10.5, fontname="helv")
    return save_doc_artifacts(doc, "NIC_Copy")


def generate_completed_affidavit():
    doc = fitz.open()
    page = create_styled_page(doc, "Completed Affidavit Draft - Corporate Registration", "Form 18 / Statutory Declaration under Companies Act No. 7 of 2007")

    body = (
        "IN THE MATTER OF THE COMPANIES ACT NO. 07 OF 2007\n"
        "AND IN THE MATTER OF CORPORATE REGISTRATION FOR: STERLING ENTERPRISES (PVT) LTD\n\n"
        "COMPLETED STATUTORY AFFIDAVIT DRAFT\n\n"
        "I, Sophia Elena Sterling (NIC No: 199298765432), residing at No. 18, Palm Avenue, Kandy, being a Buddhist / Christian, "
        "do hereby solemnly, sincerely and truly declare and affirm as follows:\n\n"
        "1. I am the proposed Director and Promoter of the above-named company and am competent to depose to the facts herein.\n"
        "2. The registered office of the company shall be situated at Level 12, World Trade Center, Colombo 01.\n"
        "3. The primary object of the corporate entity is legal consultancy, software compliance, and corporate administration.\n"
        "4. I have read and understood the Articles of Association and confirm full compliance with all statutory requirements under Section 4 of the Companies Act.\n"
        "5. I am not an undischarged insolvent, nor have I been convicted of any offense involving moral turpitude or fraud.\n\n"
        "AFFIRMED AND SIGNED AT COLOMBO on this 5th day of September 2026.\n\n"
        "Deponent:  [Signed: Sophia Elena Sterling]\n\n"
        "BEFORE ME:\n"
        "H. L. Senanayake, Commissioner for Oaths / Attorney-at-Law\n"
        "Official Seal: [COMMISSIONER FOR OATHS - REGISTRATION CO/9921]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=9.5, fontname="helv")
    return save_doc_artifacts(doc, "Completed_Affidavit_Draft")


def generate_witness_details():
    doc = fitz.open()
    page = create_styled_page(doc, "Official Witness Details and Attestation Schedule", "Corporate Incorporation & Legal Registry Form - Schedule of Witnesses")

    body = (
        "SCHEDULE OF OFFICIAL WITNESS DETAILS\n"
        "Reference Service: Corporate Registration / Deed Attestation\n\n"
        "WITNESS 01:\n"
        "--------------------------------------------------------------------------------------------------------\n"
        "Full Name: Mr. Kamal Shantha Perera\n"
        "National Identity Card (NIC): 197945612300\n"
        "Occupation: Senior Chartered Accountant (FCA, ACMA)\n"
        "Residential Address: No. 12/A, Galle Road, Colombo 03\n"
        "Contact Number: +94 77 123 4567\n"
        "Email: kamal.perera@example.com\n"
        "Signature: [Signed: Kamal S. Perera]                        Date: 05/09/2026\n"
        "--------------------------------------------------------------------------------------------------------\n\n"
        "WITNESS 02:\n"
        "--------------------------------------------------------------------------------------------------------\n"
        "Full Name: Ms. Nimali Ruwanthika Fernando\n"
        "National Identity Card (NIC): 198867890123\n"
        "Occupation: Attorney-at-Law & Notary Public\n"
        "Residential Address: No. 55, Temple Road, Colombo 05\n"
        "Contact Number: +94 71 987 6543\n"
        "Email: nimali.fernando@law.lk\n"
        "Signature: [Signed: Nimali R. Fernando]                     Date: 05/09/2026\n"
        "--------------------------------------------------------------------------------------------------------\n\n"
        "ATTESTING OFFICER CONFIRMATION:\n"
        "I certify that the above witnesses appeared personally, presented valid National Identity Cards, and signed in my presence.\n"
        "Signature & Notarial Stamp: [David M. Rathnayake - Notary Public]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=9.5, fontname="helv")
    return save_doc_artifacts(doc, "Witness_Details")


def generate_power_of_attorney_draft():
    doc = fitz.open()
    page = create_styled_page(doc, "General Power of Attorney (Draft)", "Deed of Attorney Ref: POA-2026-7782 | Powers of Attorney Ordinance")

    body = (
        "GENERAL POWER OF ATTORNEY\n\n"
        "KNOW ALL MEN BY THESE PRESENTS that I, Alexander Vance (NIC No: 198512345678), residing at No. 42, Lotus Grove, Colombo 07 "
        "(hereinafter called 'the Principal'), do hereby nominate, constitute and appoint Sophia Elena Sterling (NIC No: 199298765432), "
        "residing at No. 18, Palm Avenue, Kandy (hereinafter called 'the Attorney'), to be my true and lawful Attorney for me and in my name.\n\n"
        "POWERS AND AUTHORITIES CONFERRED:\n"
        "1. Property Management: To manage, lease, collect rent, and maintain all properties and lands belonging to the Principal.\n"
        "2. Legal & Court Representation: To sign, affirm affidavits, appear before registrars, and represent the Principal in all legal proceedings.\n"
        "3. Financial Administration: To operate bank accounts, execute vouchers, and pay statutory taxes and utility rates.\n"
        "4. Revocation: This Power of Attorney shall remain in full force until expressly revoked in writing.\n\n"
        "RATIFICATION:\n"
        "The Principal hereby ratifies and confirms all lawful acts and deeds executed by the said Attorney.\n\n"
        "Principal Signature:  [Signed: Alexander Vance]             Date: 05/09/2026\n"
        "Attorney Acceptance: [Signed: Sophia Elena Sterling]        Date: 05/09/2026\n\n"
        "NOTARIAL ATTESTATION:\n"
        "Signed and acknowledged before me, David M. Rathnayake, Notary Public for Western Province.\n"
        "Seal & Signature: [David M. Rathnayake - Notary Public #NP-44210]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=9.5, fontname="helv")
    return save_doc_artifacts(doc, "Power_of_Attorney_Draft")


def generate_draft_will_agreement():
    doc = fitz.open()
    page = create_styled_page(doc, "Last Will and Testament (Draft Agreement)", "Testamentary Docket: LWT/2026/09-12 | Registry of the Supreme Court")

    body = (
        "THIS IS THE LAST WILL AND TESTAMENT OF ME, Alexander Vance (NIC No: 198512345678), residing at No. 42, Lotus Grove, Colombo 07.\n\n"
        "1. REVOCATION: I hereby revoke all former wills, codicils, and testamentary dispositions made by me.\n"
        "2. EXECUTOR APPOINTMENT: I appoint Sophia Elena Sterling to be the sole Executrix and Trustee of this my Will.\n"
        "3. DEVISE OF IMMOVABLE PROPERTY: I give, devise and bequeath my residential property at Lot 4B, Lotus Grove, Colombo 07 "
        "unto my daughter Elena Vance absolutely.\n"
        "4. RESIDUARY ESTATE: All the rest, residue, and remainder of my real and personal estate, including bank holdings and shares, "
        "I bequeath to my named trustees for charitable and educational distribution.\n\n"
        "IN WITNESS WHEREOF I have set my hand to this my Last Will and Testament on this 5th day of September 2026.\n\n"
        "Testator:  [Signed: Alexander Vance]                        Date: 05/09/2026\n\n"
        "ATTESTATION CLAUSE:\n"
        "Signed by the Testator in the presence of us both present at the same time who at his request in his presence and in the presence "
        "of each other have hereunto subscribed our names as witnesses:\n\n"
        "Witness 1: Kamal S. Perera (NIC: 197945612300) - Signed\n"
        "Witness 2: Nimali R. Fernando (NIC: 198867890123) - Signed\n"
        "Attesting Notary: David M. Rathnayake, Notary Public [SEAL]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=9.5, fontname="helv")
    return save_doc_artifacts(doc, "Draft_Will_Agreement")


def generate_asset_ownership_proof():
    doc = fitz.open()
    page = create_styled_page(doc, "Certificate of Asset Ownership Proof", "Land Registry Reference: LRD/WP/Asset-9901 | Official Title Certificate")

    body = (
        "CERTIFICATE OF TITLE & ASSET OWNERSHIP PROOF\n\n"
        "ISSUING AUTHORITY: Land Registry and Title Settlement Department, Western Province.\n\n"
        "PARTICULARS OF ASSET & REGISTERED PROPRIETOR:\n"
        "--------------------------------------------------------------------------------------------------------\n"
        "Proprietor Name: Alexander Vance\n"
        "National Identity Card: 198512345678\n"
        "Asset Category: Freehold Residential Land & Buildings\n"
        "Assessment No: Lot 4B, Assessment 42, Lotus Grove, Colombo 07\n"
        "Plan Details: Plan No. 8920 surveyed by Licensed Surveyor K. Perera\n"
        "Extent: 25.4 Perches (0.064 Hectares)\n"
        "Registration Volume / Folio: Vol. 412 / Folio 98\n"
        "--------------------------------------------------------------------------------------------------------\n\n"
        "ENCUMBRANCE SEARCH RESULT:\n"
        "The day book and registers of the Land Registry have been searched up to September 05, 2026. "
        "The asset is CERTIFIED FREE of any registered mortgages, seizures, or lis pendens.\n\n"
        "CERTIFYING REGISTRAR:\n"
        "I certify that Alexander Vance holds absolute and undisputed ownership of the asset herein described.\n\n"
        "Signature & State Seal: [Registrar of Lands - Certified Seal Affixed]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=9.5, fontname="helv")
    return save_doc_artifacts(doc, "Asset_Ownership_Proof")


def generate_tenancy_agreement():
    doc = fitz.open()
    page = create_styled_page(doc, "Commercial Lease and Tenancy Agreement", "Lease Reference: CLA/2026/09-441 | Stamp Duty & Registration Act")

    body = (
        "COMMERCIAL LEASE AND TENANCY AGREEMENT\n\n"
        "THIS INDENTURE OF LEASE is made on this 5th day of September 2026.\n\n"
        "BETWEEN:\n"
        "1. THE LANDLORD: Alexander Vance (NIC: 198512345678), of No. 42, Lotus Grove, Colombo 07.\n"
        "2. THE TENANT: Sterling Legal Solutions (Pvt) Ltd, represented by Managing Director Sophia Elena Sterling (NIC: 199298765432).\n\n"
        "DEMISED PREMISES:\n"
        "All that commercial office premises bearing Assessment No. 12, Floor 04, Galle Road, Colombo 03.\n\n"
        "COVENANTS AND AGREEMENTS:\n"
        "1. TERM: A period of two (02) years commencing from October 1, 2026 to September 30, 2028.\n"
        "2. RENT: Monthly rental of LKR 250,000 payable on or before the 5th day of each calendar month.\n"
        "3. SECURITY DEPOSIT: The Tenant has deposited six (06) months' refundable rental amounting to LKR 1,500,000.\n"
        "4. PERMITTED USE: Exclusively for commercial legal and corporate office purposes.\n"
        "5. REPAIRS & RATES: Landlord to bear assessment municipal taxes; Tenant to bear electricity, water, and interior upkeep.\n\n"
        "Landlord Signature:  [Signed: Alexander Vance]              Date: 05/09/2026\n"
        "Tenant Signature:    [Signed: Sophia Elena Sterling]         Date: 05/09/2026\n\n"
        "WITNESSES & NOTARIAL ATTESTATION:\n"
        "Attested and stamped in accordance with the Registration of Documents Ordinance.\n"
        "Notary Public: David M. Rathnayake [OFFICIAL NOTARIAL SEAL]"
    )
    page.insert_textbox(fitz.Rect(45, 105, 550, 790), body, fontsize=9.5, fontname="helv")
    return save_doc_artifacts(doc, "Tenancy_Agreement")


if __name__ == "__main__":
    print("Generating all sample documents in sample_documents/ ...")
    generate_original_contract()
    generate_amendment_request_letter()
    generate_nic_copy()
    generate_completed_affidavit()
    generate_witness_details()
    generate_power_of_attorney_draft()
    generate_draft_will_agreement()
    generate_asset_ownership_proof()
    generate_tenancy_agreement()
    print("All documents generated successfully!")
