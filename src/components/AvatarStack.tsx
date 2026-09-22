export function AvatarStack({ people, limit = 3 }: { people: string[]; limit?: number }) {
  const visible = people.slice(0, limit)
  return (
    <div className="avatar-stack" aria-label={`Equipe: ${people.join(', ')}`}>
      {visible.map((person, index) => (
        <span key={person} className={`avatar avatar--${index % 4}`}>{person}</span>
      ))}
      {people.length > limit && <span className="avatar avatar--more">+{people.length - limit}</span>}
    </div>
  )
}
