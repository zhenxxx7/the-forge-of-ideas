// Scene wording follows the latest user-supplied storyboard screenshots.
export const SCRIPT = {
  prepare: 'It’s time to prepare for your quest. Let’s uncover some things you will need to look out for.',
  entrance: 'When you are ready, let us enter the Forge.',
  generateIntro: 'Welcome to our first stop in the Forge of Ideas. When approaching a question, we begin by generating ideas.',
  generateExplore: 'Sometimes, ideas for your essay may also come from things you have learned in class, or even general knowledge about the theme. Look at some of these ideas around the house in the gears on the walls.',
  generateCollected: 'You have selected a mix of ideas. It is good to let the ideas flow when you first approach a text.',
  sortIntro: 'We will now sort your ideas based on how relevant they are to the questions. While generating ideas, we would already be…',
  sort: 'You can now review the ideas you have chosen and sort them into central ideas, supporting, and less relevant.',
  connectIntro: 'Welcome to the third stage – Connecting Ideas. As we gather and sort ideas, the connections between them would already be coming to you.',
  connect: 'To find connections, look at the ores you have sorted previously. Generally, a main idea should be connected to a supporting idea.',
  connectionMade: 'Well done! There is a good connection between these ideas. Type a connecting statement in the box to explain how these ideas are connected. To further strengthen this crystal, you can try combining it with another supporting idea ore. Each main idea ore can be connected with up to two supporting idea ores.',
  elaborateChoose: 'Drag the crystal you have made into the central chamber. The surrounding flasks will fill with runes that can be used…',
  infusions: 'Beautiful infusions. Click on them to learn more about them.',
  beastIntro: 'Hear the Beast as it approaches. When you see it, you will need to cast the shadows away with your infusions and shed light on the darkness that plagues this land. If your ideas are potent enough, you might just succeed in dispelling this Beast.',
  beast: 'Launch the completed infusions at the beast. Ensure your aim is true. A missed attack will only weaken you. The bar on the top left tracks your level of Confusion. When the bar is filled, the shadows will consume you and you would have failed to overcome the Inarticulate Beast.',
  ending: 'Congratulations! The Inarticulate Beast has been defeated and light has been brought back to this valley. When you are ready, enter the Archival Hall through the portal where your work today will be celebrated.',
  archive: 'Welcome to the Archival Hall, where a record of your great deeds today will be forever recorded alongside the names of other great heroes.',
};

export const RECAPS: Record<number, string> = {
  1: SCRIPT.prepare,
  2: 'You have now learned more about generating ideas. You can click on this icon to review what you have learned and gathered at this stage. You can return to this stage at any point if you wish, especially if you find that you might need to try different ideas. Rereading the text for new ideas is also an important part of the writing process.',
  3: 'You have now learned more about evaluating the relevance of an idea. You can click on this icon to review what you have learned and gathered at this stage. You can return to this stage at any point if you wish, if you find that perhaps an idea you had thought was central may no longer be a central idea.',
  4: 'You have now learned more about generating ideas. You can click on this icon to review what you have learned and gathered at this stage. You can return to this stage at any point if you wish, especially if you find that you might need to try different ideas. Rereading the text for new ideas is also an important part of the writing process.',
  5: 'You have now learned more about elaborating on ideas. You can click on this icon to review what you have learned at this stage. You can return to this stage at any point if you wish, if you find perhaps you want to change the infusions you have crafted.',
  6: SCRIPT.ending,
};

export function introduction(name: string): string {
  return `Hello ${name}. You have trained hard to make it this far, and now you must put all you have learned to the test. Today, we will look at an extract from Ray Bradbury’s short story “The Veldt” and learn how to make use of the Generate-Sort-Connect-Elaborate strategy to craft an essay response to a PBQ part (a) question.`;
}
