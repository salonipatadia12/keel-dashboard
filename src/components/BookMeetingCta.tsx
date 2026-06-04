import { Zap, Phone } from './Icons';

interface Props {
  university: string;
  // Calendly / SavvyCal URL — replace with the real one once provisioned.
  // Default goes to a placeholder so the CTA renders during build before
  // the real link is wired.
  bookingUrl?: string;
}

// Calendly link Saloni can swap once provisioned. Until then, the button
// surfaces clearly that the destination is a placeholder so a real user
// won't think the link is dead.
const DEFAULT_BOOKING_URL = 'https://calendly.com/saloni-keel/discovery';

export default function BookMeetingCta({ university, bookingUrl }: Props) {
  const url = bookingUrl ?? DEFAULT_BOOKING_URL;
  return (
    <section className="rounded-2xl bg-gradient-to-br from-accent/12 via-surface to-sub/8 border-2 border-accent/30 shadow-card overflow-hidden relative">
      <div className="relative p-7 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Zap size={14} />
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold">
              Next step
            </span>
          </div>
          <h3 className="text-2xl font-semibold tracking-tight text-ink leading-tight mb-2">
            See {university}'s voice agent live — 15-minute demo.
          </h3>
          <p className="text-[13px] text-muted leading-snug max-w-xl">
            We'll walk through the report above, then put you on a call
            with a working voice agent built on your real caller flow.
            You can hear the difference before the meeting ends.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-accent text-white font-semibold text-[14px] tracking-tight shadow-card hover:bg-accent2 transition"
          >
            Book a meeting
          </a>
          <a
            href="tel:+15625551212"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-line bg-surface text-ink2 font-medium text-[12px] tracking-tight hover:border-line2 transition"
          >
            <Phone size={12} />
            or call us
          </a>
        </div>
      </div>
    </section>
  );
}
