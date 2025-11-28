import { createFileRoute } from '@tanstack/react-router'
import { EnigmaMachine } from '../components/EnigmaMachine'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return <EnigmaMachine />
}
