import { createFileRoute } from '@tanstack/react-router'

import { RoomsShell } from '../../components/RoomsShell'
import { useSession } from '../../components/SessionProvider'

export const Route = createFileRoute('/rooms/')({
  component: RoomsHome,
})

function RoomsHome() {
  const { token } = useSession()

  return (
    <RoomsShell>
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Nebula</p>
        <h1 className="text-3xl font-semibold text-white">Pick a room to start chatting</h1>
        <p className="max-w-xl text-slate-400">
          {token
            ? 'Choose a room from the left sidebar or tap the plus to explore public rooms or join a private one.'
            : 'Log in to view and join rooms. Use the plus on the left to explore once signed in.'}
        </p>
      </div>
    </RoomsShell>
  )
}
