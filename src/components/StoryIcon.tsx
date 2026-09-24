export type StoryIconName = 'home' | 'raven' | 'journal' | 'door' | 'previous' | 'next' | 'hourglass';

export function StoryIcon({ name }: { name: StoryIconName }) {
  const src = name === 'previous' || name === 'next' ? `/assets/navigation-${name}.svg` : `/assets/mockup-${name}.webp`;
  return <img className={`story-icon story-icon-${name}`} src={src} alt="" aria-hidden="true" draggable={false} />;
}
