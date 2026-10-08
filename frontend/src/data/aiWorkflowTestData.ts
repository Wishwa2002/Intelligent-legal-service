export type TestAiWorkflow = {
  workflowId: string;
  status: "AwaitingApproval" | "Completed";

  lawyer: {
    lawyerId: string;
    name: string;
    qualification: string;
    practiceArea: string;
    experience: number;
  };

  slot: {
    slotId: string;
    date: string;
    time: string;
  };

  documents: string[];

  validationPassed: boolean;
};

export const createTestAiWorkflow = (
  serviceRequestId: string
): TestAiWorkflow => ({
  workflowId: `WF-${serviceRequestId}`,

  status: "AwaitingApproval",

  lawyer: {
    lawyerId: "c76f3f7e-689d-431f-9134-97522c5cbe3a",

    // Use the exact display name that already exists in your DB.
    name: "Lawyer 1",

    qualification: "LL.B",
    practiceArea: "Real Estate & Property Law",
    experience: 4,
  },

  slot: {
    slotId: "03675ef7-f071-97e5-364a-0b001c023a02",
    date: "2026-10-06",
    time: "09:00 AM - 09:30 AM",
  },

  documents: [
    "National Identity Card",
    "Title Deed",
    "Proof of Ownership",
    "Previous Land Agreements",
  ],

  validationPassed: true,
});