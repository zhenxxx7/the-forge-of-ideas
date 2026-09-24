export function ConnectionCrystal({ strengthened = false }: { strengthened?: boolean }) {
  return <img className={`connection-crystal ${strengthened ? 'crystal-strengthened' : ''}`} src="/assets/ore-5.webp" alt="" aria-hidden="true" draggable={false} />;
}
