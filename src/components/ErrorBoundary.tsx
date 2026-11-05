import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'
import { Hoot } from './Hoot'

type Props = {
  children: ReactNode
  actionLabel: string
  onReset: () => void // takes the learner somewhere safe; the boundary then tries again
}

// If a screen crashes while drawing, React would blank the whole page. This shows
// Hoot and a way back instead. Saved progress isn't touched. React only offers
// this through a class component, which is why this one isn't a function.
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Learn screen crashed', error.name, info.componentStack) // the name only: never course or student content
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="learn-gate" role="alert">
        <Hoot pose="oops" size={132} decorative />
        <h1 className="screen-title">Hoot tripped over that one</h1>
        <p className="muted">Something on this screen broke. Your progress is still saved.</p>
        <Button block onClick={() => { this.props.onReset(); this.setState({ failed: false }) }}>{this.props.actionLabel}</Button>
      </div>
    )
  }
}
