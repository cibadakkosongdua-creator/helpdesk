import { TicketTrack } from "@/components/helpdesk/ticket-track"

export default async function TicketTrackPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <TicketTrack code={decodeURIComponent(code)} />
}

export const dynamic = "force-dynamic"
