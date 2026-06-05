import { Zap, Phone } from './Icons';
import { BOOKING_URL, CONTACT_PHONE } from '../lib/config';

interface Props {
  university: string;
}

// "Book a meeting" call-to-action below the Pitch. Both destinations
// (Calendly URL + phone number) come from lib/config so a single edit
// updates every tenant report. Until either is configured the CTA
// renders a clearly-placeholder badge — that way a fresh deploy can't
// silently route a real prospect to a dead Calendly or a wrong number.
export default function BookMeetingCta({ university }: Props) {
  const hasBooking = BOOKING_URL.trim().length > 0;
  const hasPhone = CONTACT_PHONE.replace(/\D/g, '').length >= 10;
  const telHref = hasPhone ? `tel:+${CONTACT_PHONE.replace(/\D/g, '')}` : null;

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
        <div className="flex flex-col gap-2 shrink-0 items-stretch min-w-[180px]">
          {hasBooking ? (
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-accent text-white font-semibold text-[14px] tracking-tight shadow-card hover:bg-accent2 transition"
            >
              Book a meeting
            </a>
          ) : (
            <div
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-surface2 border border-dashed border-line2 text-muted2 font-medium text-[13px] tracking-tight"
              title="Set BOOKING_URL in src/lib/config.ts"
            >
              Booking link coming soon
            </div>
          )}
          {telHref && (
            <a
              href={telHref}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-line bg-surface text-ink2 font-medium text-[12px] tracking-tight hover:border-line2 transition"
            >
              <Phone size={12} />
              or call us
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
