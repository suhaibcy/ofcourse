type SectionHeaderProps = {
  label: string // "Today", "This week", "Later"
  count?: number
}

export function SectionHeader({ label, count }: SectionHeaderProps) {
  return (
    <div className="section">
      <h2 className="section__label">{label}</h2>
      {count !== undefined && <span className="section__count">{count}</span>}
    </div>
  )
}
