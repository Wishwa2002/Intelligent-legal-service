const steps = [
  {
    number: "01",
    title: "Customer Request",
    description: "Tell us what legal help you need in plain language.",
  },
  {
    number: "02",
    title: "AI Analysis",
    description: "Our AI reviews your case details and requirements.",
  },
  {
    number: "03",
    title: "Lawyer Recommendation",
    description: "Get matched with lawyers suited to your specific case.",
  },
  {
    number: "04",
    title: "Appointment Booking",
    description: "Schedule a consultation at a time that works for you.",
  },
  {
    number: "05",
    title: "Legal Solution",
    description: "Work with your lawyer through to resolution.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-navy-900 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-gold-light">
            The Docket
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-navy-100/70">
            From request to resolution, every case follows a clear,
            traceable path.
          </p>
        </div>

        {/* Docket timeline */}
        <div className="relative mt-20">
          <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent lg:left-1/2 lg:block" />

          <ol className="relative flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-4">
            {steps.map((step, index) => (
              <li
                key={step.number}
                className="relative flex flex-1 gap-4 lg:flex-col lg:items-center lg:text-center"
              >
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-navy-900 font-mono text-xs font-medium text-gold-light">
                  {step.number}
                </div>
                <div className="lg:mt-5">
                  <h3 className="font-display text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[200px] text-sm leading-relaxed text-navy-100/60 lg:mx-auto">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <span className="absolute left-[17px] top-9 h-[calc(100%-2rem)] w-px bg-gold/20 lg:hidden" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
