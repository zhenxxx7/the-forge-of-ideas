import type { IdeaId } from '../stage2';

const ores: Record<IdeaId, number> = {
  lifelike: 0, setting: 1, senses: 4, reactions: 3,
  uncertainty: 2, pace: 6, control: 5, contrast: 8,
};

export function SortGem({ id }: { id: IdeaId }) {
  return <img className="sort-gem" src={`/assets/ore-${ores[id]}.webp`} alt="" aria-hidden="true" draggable={false} />;
}
