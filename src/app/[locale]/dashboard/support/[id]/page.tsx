import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, LifeBuoy, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/dictionaries";
import { statusTone } from "@/lib/order-display";
import { createClient } from "@/lib/supabase/server";
import { formatOrderDate, systemStatusLabel } from "@/lib/status-labels";
import { replyTicketAction } from "../../actions";

export default async function SupportTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const locale = raw;
  const ar = locale === "ar";
  const query = await searchParams;
  const user = await requireUser(locale);
  const supabase = await createClient();

  const [{ data: ticket, error: ticketError }, { data: messages, error: messagesError }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id,reference_number,subject,category,priority,status,created_at,updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id,author_id,message,internal,created_at")
      .eq("ticket_id", id)
      .eq("internal", false)
      .order("created_at", { ascending: true }),
  ]);

  if (ticketError || messagesError) {
    console.error("[support-ticket] load failed", { userId: user.id, code: ticketError?.code || messagesError?.code });
    return (
      <section className="panel dashboardErrorPanel">
        <p>{ar ? "تعذر تحميل التذكرة مؤقتاً." : "Could not load this ticket temporarily."}</p>
        <Link className="primaryButton" href={`/${locale}/dashboard/support/${id}`}>{ar ? "إعادة المحاولة" : "Retry"}</Link>
      </section>
    );
  }
  if (!ticket) notFound();

  const feedback = query.error
    ? <div className="formAlert"><CircleAlert />{ar ? "تعذر إرسال الرسالة." : "Could not send the message."}</div>
    : query.saved || query.created
      ? <div className="formSuccess"><ShieldCheck />{ar ? "تم الحفظ بنجاح." : "Saved successfully."}</div>
      : null;

  const closed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <>
      <div className="pageHeading">
        <div>
          <span>{ar ? "الدعم" : "Support"} / {ticket.reference_number}</span>
          <h1>{ticket.subject}</h1>
          <p>{ar ? "محادثة موثقة مع فريق الدعم." : "Documented conversation with support."}</p>
        </div>
        <StatusBadge tone={statusTone(ticket.status)}>{systemStatusLabel(ticket.status, locale)}</StatusBadge>
      </div>
      {feedback}
      <section className="panel">
        <div className="ticketMeta">
          <span>{ar ? "الفئة" : "Category"}: <b>{ticket.category}</b></span>
          <span>{ar ? "الأولوية" : "Priority"}: <b>{ticket.priority}</b></span>
          <span>{ar ? "أُنشئت" : "Created"}: <b>{formatOrderDate(ticket.created_at, locale)}</b></span>
        </div>
        <div className="ticketThread" aria-live="polite">
          {messages?.length
            ? messages.map((message) => {
              const mine = message.author_id === user.id;
              return (
                <article key={message.id} className={mine ? "ticketMessage mine" : "ticketMessage"}>
                  <header>
                    <b>{mine ? (ar ? "أنت" : "You") : (ar ? "الدعم" : "Support")}</b>
                    <small>{formatOrderDate(message.created_at, locale)}</small>
                  </header>
                  <p>{message.message}</p>
                </article>
              );
            })
            : <div className="emptyState">{ar ? "لا توجد رسائل بعد." : "No messages yet."}</div>}
        </div>
        {!closed ? (
          <form action={replyTicketAction} className="stackForm ticketReply">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label>
              <span>{ar ? "ردك" : "Your reply"}</span>
              <textarea name="message" rows={4} minLength={1} required />
            </label>
            <button className="primaryButton" type="submit"><LifeBuoy />{ar ? "إرسال الرد" : "Send reply"}</button>
          </form>
        ) : (
          <div className="marketNotice">{ar ? "هذه التذكرة مغلقة." : "This ticket is closed."}</div>
        )}
        <Link className="secondaryButton" href={`/${locale}/dashboard/support`}>{ar ? "العودة للتذاكر" : "Back to tickets"}</Link>
      </section>
    </>
  );
}
