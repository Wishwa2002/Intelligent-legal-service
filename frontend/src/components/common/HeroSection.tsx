const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-navy-900 pt-32 pb-24 lg:pt-44 lg:pb-32"
    >
      {/* Ambient gradient + ledger texture */}
      <div className="pointer-events-none absolute inset-0 bg-navy-radial" />
      <div className="pointer-events-none absolute inset-0 bg-ledger-lines opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2 lg:px-10">
        {/* Copy */}
        <div className="animate-fade-up">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-gold-light">
            AI-Assisted Legal Platform
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Smart Legal Services,
            <br />
            <span className="text-gold-light">Simplified</span> With AI
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100/80">
            Connect with trusted lawyers, manage legal consultations, and get
            personalized legal assistance through our intelligent AI-powered
            platform.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#services"
              className="rounded-md bg-gold px-7 py-3.5 text-center text-sm font-semibold text-navy-900 shadow-[0_8px_24px_-6px_rgba(212,175,55,0.5)] transition-transform hover:-translate-y-0.5 hover:bg-gold-light"
            >
              Find a Lawyer
            </a>
            <a
              href="/signup"
              className="rounded-md border border-white/25 px-7 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Get Started
            </a>
          </div>
          <div className="mt-12 flex items-center gap-8 text-navy-100/60">
            <div>
              <p className="font-display text-2xl font-semibold text-white">500+</p>
              <p className="font-mono text-xs uppercase tracking-wider">Verified Lawyers</p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div>
              <p className="font-display text-2xl font-semibold text-white">24/7</p>
              <p className="font-mono text-xs uppercase tracking-wider">AI Assistance</p>
            </div>
          </div>
        </div>

        {/* Signature visual: a stylized gold Statue of Justice, balanced scales gently swaying */}
        <div className="relative mx-auto flex h-[440px] w-full max-w-md items-center justify-center animate-fade-up [animation-delay:150ms]">
          {/* Ambient glow behind the statue */}
          <div className="absolute h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute bottom-6 h-10 w-48 rounded-full bg-black/30 blur-xl" />

          <div className="relative h-full w-full animate-float-slow">
            <svg
              viewBox="0 0 240 340"
              className="mx-auto h-full w-auto drop-shadow-[0_25px_35px_rgba(0,0,0,0.45)]"
              role="img"
              aria-label="Statue of Justice holding balanced scales and a sword"
            >
              <defs>
                <linearGradient id="goldMetal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-gold-light)" />
                  <stop offset="55%" stopColor="var(--color-gold)" />
                  <stop offset="100%" stopColor="var(--color-gold-dark)" />
                </linearGradient>
                <linearGradient id="goldMetalHoriz" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-gold-dark)" />
                  <stop offset="50%" stopColor="var(--color-gold-light)" />
                  <stop offset="100%" stopColor="var(--color-gold-dark)" />
                </linearGradient>
              </defs>

              {/* Pedestal */}
              <rect x="72" y="300" width="96" height="16" rx="2" fill="var(--color-navy-800)" stroke="var(--color-gold-dark)" strokeWidth="1" />
              <rect x="90" y="288" width="60" height="14" rx="2" fill="var(--color-navy-800)" stroke="var(--color-gold-dark)" strokeWidth="1" />

              {/* Robe */}
              <path
                d="M85,104 C79,150 74,220 69,290 L171,290 C166,220 161,150 155,104 Q120,120 85,104 Z"
                fill="url(#goldMetal)"
                stroke="var(--color-gold-dark)"
                strokeWidth="1"
              />
              {/* Drapery folds */}
              <path d="M108,112 C106,175 101,235 96,288" fill="none" stroke="var(--color-gold-dark)" strokeWidth="1" opacity="0.45" />
              <path d="M120,114 C120,178 120,235 118,288" fill="none" stroke="var(--color-gold-dark)" strokeWidth="1" opacity="0.45" />
              <path d="M133,112 C135,175 140,235 145,288" fill="none" stroke="var(--color-gold-dark)" strokeWidth="1" opacity="0.45" />

              {/* Left arm, lowered, holding the sword */}
              <path d="M90,110 C78,127 68,152 65,174" fill="none" stroke="url(#goldMetal)" strokeWidth="13" strokeLinecap="round" />
              {/* Right arm, raised, holding the scales */}
              <path d="M150,108 C166,94 180,78 189,57" fill="none" stroke="url(#goldMetal)" strokeWidth="13" strokeLinecap="round" />

              {/* Neck + head */}
              <rect x="112" y="90" width="16" height="14" fill="url(#goldMetal)" />
              <circle cx="120" cy="76" r="17" fill="url(#goldMetal)" stroke="var(--color-gold-dark)" strokeWidth="1" />
              {/* Blindfold, impartial justice */}
              <rect x="102" y="72" width="36" height="7" rx="3" fill="var(--color-navy-950)" transform="rotate(-2 120 75)" />

              {/* Sword, held point-down in the left hand */}
              <circle cx="65" cy="177" r="4.5" fill="url(#goldMetal)" />
              <rect x="52" y="180" width="26" height="5" rx="1.5" fill="url(#goldMetal)" />
              <path d="M63,185 L67,185 L66,252 L64,252 Z" fill="url(#goldMetal)" />
              <path d="M64,252 L66,252 L65,262 Z" fill="url(#goldMetal)" />

              {/* Scales, held aloft in the right hand */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-3 190 38; 3 190 38; -3 190 38"
                  dur="6s"
                  repeatCount="indefinite"
                />
                <line x1="190" y1="57" x2="190" y2="36" stroke="var(--color-gold-dark)" strokeWidth="2.5" />
                <line x1="157" y1="37" x2="223" y2="37" stroke="url(#goldMetalHoriz)" strokeWidth="3" strokeLinecap="round" />
                <path d="M190,29 L182,37 L198,37 Z" fill="var(--color-gold-dark)" />

                {/* Left pan */}
                <line x1="157" y1="37" x2="150" y2="60" stroke="var(--color-gold-dark)" strokeWidth="1.5" />
                <line x1="157" y1="37" x2="164" y2="60" stroke="var(--color-gold-dark)" strokeWidth="1.5" />
                <path d="M146,60 L168,60 L162,68 L152,68 Z" fill="url(#goldMetal)" stroke="var(--color-gold-dark)" strokeWidth="1" />

                {/* Right pan */}
                <line x1="223" y1="37" x2="216" y2="60" stroke="var(--color-gold-dark)" strokeWidth="1.5" />
                <line x1="223" y1="37" x2="230" y2="60" stroke="var(--color-gold-dark)" strokeWidth="1.5" />
                <path d="M212,60 L234,60 L228,68 L218,68 Z" fill="url(#goldMetal)" stroke="var(--color-gold-dark)" strokeWidth="1" />
              </g>
            </svg>
          </div>

          <p className="absolute bottom-0 font-mono text-xs uppercase tracking-widest text-navy-100/50">
            Impartial. Balanced. AI-Assisted.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
