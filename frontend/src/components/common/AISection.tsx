const agents = [
  {
    name: "Lawyer Recommendation Agent",
    points: ["Understands customer requirements", "Finds suitable lawyers"],
  },
  {
    name: "Scheduling Agent",
    points: ["Checks availability", "Suggests suitable appointment times"],
  },
  {
    name: "Documentation Agent",
    points: [
      "Helps identify required documents",
      "Guides legal workflows",
    ],
  },
];

const AISection = () => {
  return (
    <section className="relative overflow-hidden bg-white py-24 lg:py-32">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-gold-dark">
            Behind the Platform
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
            AI Powered Legal Assistance
          </h2>
          <p className="mt-4 text-slate-soft">
            Three specialized agents work together to move your case
            forward&mdash;quietly, accurately, and around the clock.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-navy-100 bg-navy-100 md:grid-cols-3">
          {agents.map((agent, i) => (
            <div
              key={agent.name}
              className="group flex flex-col bg-white p-8 transition-colors duration-300 hover:bg-navy-900"
            >
              <span className="font-mono text-xs text-gold-dark transition-colors duration-300 group-hover:text-gold-light">
                Agent {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold text-navy-900 transition-colors duration-300 group-hover:text-white">
                {agent.name}
              </h3>
              <ul className="mt-5 flex flex-col gap-3">
                {agent.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm text-slate-soft transition-colors duration-300 group-hover:text-navy-100/80"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AISection;
