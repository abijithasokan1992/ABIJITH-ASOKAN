import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronUp,
  Cloud,
  Database,
  ExternalLink,
  Film,
  HandCoins,
  LockKeyhole,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

const capabilityCards = [
  {
    icon: PanelsTopLeft,
    title: "App Building",
    text: "How screens, user journeys, dashboards and business actions fit together.",
  },
  {
    icon: Cloud,
    title: "Cloud & Storage",
    text: "How films, files and company information can be stored and delivered securely.",
  },
  {
    icon: Database,
    title: "Database & Accounts",
    text: "How creators, studios, buyers, titles, permissions and records are organised.",
  },
  {
    icon: LockKeyhole,
    title: "Security & Rights",
    text: "Why privacy, controlled access, copyright and written authorisation matter.",
  },
  {
    icon: HandCoins,
    title: "Payments & Business",
    text: "How plans, billing, licensing and responsible revenue can connect to the product.",
  },
  {
    icon: Sparkles,
    title: "AI-Assisted Development",
    text: "How to guide technology tools with cinema knowledge while keeping founder control.",
  },
];

const journey = [
  ["01", "Upload", "Film details and protected materials."],
  ["02", "Verify", "Rights, quality and readiness."],
  ["03", "Present", "A professional catalogue for buyers."],
  ["04", "License", "Discuss terms with verified partners."],
  ["05", "Earn", "Track approved deals and revenue."],
];

const ecosystem = [
  ["01", "Crayons Pictures", "Film production, original stories and intellectual property creation."],
  ["02", "Crayons Bridge", "Distribution, licensing, syndication and partner delivery."],
  ["03", "Crayons Loop", "Streaming and digital exhibition for audiences."],
  ["04", "StreamVista Cloud X", "Secure cloud workspace connecting creators, studios and buyers."],
];

const builtItems = [
  "Public StreamVista website and company identity",
  "Creator, Studio and Buyer account journeys",
  "Secure upload, vault and project concepts",
  "Rights, review, licensing and distribution workflows",
  "Pricing, billing and payment foundations",
  "Legal, privacy, IP and trust pages",
];

const functions = [
  ["Product & Development", "App, testing and release"],
  ["Security & Infrastructure", "Privacy, access and stability"],
  ["Sales & Partnerships", "Creators, studios and buyers"],
  ["Pricing & Analytics", "Business model and measurement"],
  ["Marketing & PR", "Positioning and communication"],
  ["CRM & Support", "Contacts, follow-up and users"],
  ["Legal Operations", "Rights and agreement support"],
  ["Finance & Compliance", "Human CA review and controls"],
];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 720);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="site-shell">
      <div className="ambient ambient-a" aria-hidden="true" />
      <div className="ambient ambient-b" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="StreamVista founder story home">
          <span className="brand-mark">SV</span>
          <span className="brand-word">STREAMVISTA</span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#story">Story</a>
          <a href="#learned">What he learned</a>
          <a href="#simple">How it works</a>
          <a href="#ecosystem">Ecosystem</a>
          <a href="#built">Built</a>
          <a href="#status">Status</a>
        </nav>
        <a className="nav-cta" href="https://streamvista.in/" target="_blank" rel="noreferrer">
          Open StreamVista <ExternalLink size={14} />
        </a>
      </header>

      <main>
        <section className="hero section-pad" id="top">
          <div className="hero-copy">
            <p className="eyebrow">STREAMVISTA · ONE FOUNDER · ONE LONG-TERM VISION</p>
            <h1>This is what Abi built.</h1>
            <p className="hero-lead">
              For around one and a half years, Abi has been turning his cinema experience into a real
              technology and media business: StreamVista — an integrated ecosystem being built to securely
              create, preserve, license and deliver films.
            </p>
            <div className="hero-actions">
              <a className="primary-btn" href="#simple">
                Understand it simply <ArrowRight size={17} />
              </a>
              <a className="secondary-btn" href="https://streamvista.in/" target="_blank" rel="noreferrer">
                Open StreamVista <ExternalLink size={16} />
              </a>
            </div>
            <div className="hero-credit">
              <span className="credit-label">FOUNDER JOURNEY</span>
              <strong>Abijith Asokan</strong>
              <span>Filmmaker · Producer · Writer · Director · Media Entrepreneur</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Abstract AA founder monogram">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="monogram">AA</div>
            <div className="art-caption">
              <span>FROM CINEMA</span>
              <span className="line" />
              <span>TO SYSTEMS</span>
            </div>
          </div>
        </section>

        <section className="story-section section-pad" id="story">
          <Reveal className="section-heading narrow">
            <p className="kicker">A MESSAGE FOR FAMILY AND FRIENDS</p>
            <h2 lang="ml">ഇത് വെറുതെ സമയം കളഞ്ഞതല്ല.</h2>
          </Reveal>
          <Reveal className="story-grid">
            <div className="malayalam-copy" lang="ml">
              <p>
                Tech, coding, cloud, database എന്നിവയിൽ മുൻപരിചയം ഇല്ലാതെയാണ് Abi ഈ യാത്ര തുടങ്ങിയത്.
                Cinema experience മാത്രമായിരുന്നു തുടക്കത്തിലെ ശക്തി. അതിനുശേഷം കഴിഞ്ഞ ഒന്നര വർഷത്തോളം
                പഠിച്ചും പരീക്ഷിച്ചും പരാജയപ്പെട്ടും തിരുത്തിയും, product എങ്ങനെ നിർമ്മിക്കണം എന്നത് ഘട്ടംഘട്ടമായി
                സ്വയം മനസ്സിലാക്കി.
              </p>
              <p>
                ഇന്ന് കാണുന്ന StreamVista platform, അതിന്റെ workflows, creator–buyer ecosystem, rights and
                licensing structure എന്നിവ ആ പഠനത്തിന്റെ working foundation ആണ്.
              </p>
              <p>
                ഇത് ഇപ്പോഴും development-ലാണ്. പക്ഷേ vision മാത്രം അല്ല ഇനി — പ്രവർത്തിക്കുന്ന ഒരു foundation ഉണ്ട്.
              </p>
            </div>
            <blockquote className="story-quote">
              “He did not begin as a developer. He began with cinema experience, a serious problem to solve and
              the willingness to learn.”
            </blockquote>
          </Reveal>
        </section>

        <section className="capabilities section-pad" id="learned">
          <Reveal className="section-heading">
            <p className="kicker">BUILT WITHOUT A TECHNICAL BACKGROUND</p>
            <h2>He learned what the vision required.</h2>
            <p>
              This was not one course or one ready-made template. Each capability was learned because the product
              needed it, then connected into one working system.
            </p>
          </Reveal>
          <div className="capability-grid">
            {capabilityCards.map(({ icon: Icon, title, text }, index) => (
              <Reveal className="capability-card" key={title}>
                <div className="card-index">0{index + 1}</div>
                <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
                <span className="learned-label">LEARNED</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="simple-section section-pad" id="simple">
          <Reveal className="section-heading narrow">
            <p className="kicker">THE IDEA IN ONE MINUTE</p>
            <h2>What problem does StreamVista solve?</h2>
            <p>
              Independent filmmakers often struggle with scattered files, unclear rights records, difficult buyer
              access and slow licensing conversations. StreamVista is being built to bring that journey into one
              secure place.
            </p>
          </Reveal>
          <div className="journey-line">
            {journey.map(([num, title, text]) => (
              <Reveal className="journey-step" key={title}>
                <span className="journey-num">{num}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="ecosystem-section section-pad" id="ecosystem">
          <Reveal className="section-heading narrow">
            <p className="kicker">ONE CONNECTED ECOSYSTEM</p>
            <h2>Four parts, one purpose.</h2>
          </Reveal>
          <div className="ecosystem-map">
            <div className="ecosystem-core">
              <span>STREAMVISTA</span>
              <strong>Creation → Protection → Licensing → Value</strong>
            </div>
            {ecosystem.map(([num, title, text], index) => (
              <Reveal className={`ecosystem-node node-${index + 1}`} key={title}>
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="built-section section-pad" id="built">
          <Reveal className="section-heading">
            <p className="kicker">WHAT HAS BEEN BUILT</p>
            <h2>From an idea to a working foundation.</h2>
          </Reveal>
          <Reveal className="built-panel">
            {builtItems.map((item) => (
              <div className="built-item" key={item}>
                <BadgeCheck size={20} strokeWidth={1.7} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </Reveal>
        </section>

        <section className="status-section section-pad" id="status">
          <Reveal className="status-panel">
            <div>
              <p className="kicker">AN HONEST STATUS</p>
              <h2>Still being built. Still being proven.</h2>
            </div>
            <div className="status-copy">
              <p>
                StreamVista is still in development and testing. It is not being presented as a finished global
                company or guaranteed success. The foundation is real; stability, customer onboarding, pricing and
                revenue are the next challenges.
              </p>
              <strong>That is how responsible companies are built: learn, test, correct, protect and grow.</strong>
            </div>
          </Reveal>
        </section>

        <section className="functions-section section-pad">
          <Reveal className="section-heading narrow">
            <p className="kicker">A COMPANY STRUCTURE BUILT BY ONE FOUNDER</p>
            <h2>AI-assisted specialist functions.</h2>
            <p>
              These are AI-assisted operational functions — not a claim of large human departments. They help the
              company think systematically while important decisions remain under founder control.
            </p>
          </Reveal>
          <div className="function-grid">
            {functions.map(([title, text], index) => (
              <Reveal className="function-row" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="quote-section section-pad">
          <Reveal>
            <Film size={31} strokeWidth={1.4} aria-hidden="true" />
            <blockquote>
              “Cinema has always been my work. StreamVista is my attempt to build the missing bridge between
              creation, protection, distribution and long-term value.”
            </blockquote>
          </Reveal>
        </section>

        <section className="closing-section section-pad">
          <Reveal className="closing-copy" lang="ml">
            <p>Abi വഴിതെറ്റിയതല്ല. അറിയാത്ത ഒരു പുതിയ വഴി പഠിച്ചുകൊണ്ട് നിർമ്മിക്കുകയായിരുന്നു.</p>
            <p>
              കഴിഞ്ഞ ഒന്നര വർഷം വെറുതെയായില്ല. അത് cinema experience-നെ technology, business systems, rights
              management, distribution and product thinking എന്നിവയുമായി ബന്ധിപ്പിച്ച ഒരു പുതിയ foundation ആയി മാറി.
            </p>
            <p>
              StreamVista ഇപ്പോഴും തുടക്കത്തിലാണ്. Stability, customers, partnerships and sustainable revenue എന്നിവയാണ്
              ഇനി തെളിയിക്കേണ്ടത്.
            </p>
          </Reveal>
          <Reveal className="closing-lines">
            <p>The idea became a product foundation.</p>
            <p>The learning became capability.</p>
            <p>And the journey became a company with a clear purpose.</p>
          </Reveal>
        </section>

        <section className="founder-signoff section-pad">
          <Reveal className="signoff-card">
            <div className="signoff-monogram">AA</div>
            <div>
              <p className="kicker">FOUNDER</p>
              <h2>Abijith Asokan</h2>
              <p>Founder & Managing Director · StreamVista (OPC) Private Limited</p>
              <span>Official/legal name: ABIJITH U A</span>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-links">
          <a href="https://streamvista.in/about" target="_blank" rel="noreferrer">Founder & company</a>
          <a href="https://streamvista.in/creator-preview" target="_blank" rel="noreferrer">Creator preview</a>
          <a href="https://streamvista.in/partners" target="_blank" rel="noreferrer">Partners</a>
          <a href="https://streamvista.in/" target="_blank" rel="noreferrer">Product website</a>
        </div>
        <div className="footer-meta">
          <span>STREAMVISTA (OPC) PRIVATE LIMITED · Ernakulam, Kerala, India</span>
          <span>A public introduction for family and friends · Product in development</span>
        </div>
      </footer>

      {showTop && (
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
          <ChevronUp size={19} />
        </button>
      )}
    </div>
  );
}

export default App;
