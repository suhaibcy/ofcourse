import { Reorder, useDragControls } from 'motion/react'
import { useState } from 'react'
import type { OrderBlock } from '../../lib/course'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { shuffled, type BlockProps } from './blockTypes'

// One row. Only the grip starts a drag, so swiping the rest of the row still
// scrolls the page on a phone.
function Row({ item, state }: { item: string; state: string }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} className={`order-row ${state}`}>
      <span className="order-row__grip" onPointerDown={(e) => controls.start(e)} aria-hidden="true"><Icon name="grip" size={20} /></span>
      <span>{item}</span>
    </Reorder.Item>
  )
}

export function PutInOrder({ block, onMiss, onFinish }: BlockProps<OrderBlock>) {
  const [items, setItems] = useState(() => shuffled(block.items))
  const [checked, setChecked] = useState(false)
  const [missed, setMissed] = useState(false)

  const allRight = items.every((item, i) => item === block.items[i])
  const solved = checked && allRight

  function check() {
    setChecked(true)
    if (!allRight) {
      setMissed(true)
      onMiss()
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <Reorder.Group axis="y" values={items} onReorder={(next: string[]) => { setItems(next); setChecked(false) }} className="order-list">
        {items.map((item, i) => (
          <Row key={item} item={item} state={!checked ? '' : item === block.items[i] ? 'order-row--right' : 'order-row--wrong'} />
        ))}
      </Reorder.Group>
      {checked && !allRight && <p className="feedback feedback--wrong" role="status">Green rows are in the right place. Drag the others and try again.</p>}
      {solved && <p className="feedback feedback--right" role="status">{block.explain}</p>}
      {solved
        ? <Button block onClick={() => onFinish(!missed)}>Finish</Button>
        : <Button block onClick={check}>Check my order</Button>}
    </div>
  )
}
