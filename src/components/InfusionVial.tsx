import type { IdeaId } from '../stage2';

const variants: Record<IdeaId, number> = {
  lifelike: 0, setting: 1, senses: 2, reactions: 0,
  uncertainty: 2, pace: 1, control: 2, contrast: 1,
};

export function InfusionVial({ main }: { main: IdeaId }) {
  return <img className="infusion-vial" src={`/assets/infusion-${variants[main]}.webp`} alt="" aria-hidden="true" draggable={false} />;
}
