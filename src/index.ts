import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { SumoSystem } from './sumo-system.js';
import { UISystem } from './ui-system.js';
import { AudioSystem } from './audio-system.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(SumoSystem);
  world.registerSystem(UISystem);
  world.registerSystem(AudioSystem);
});
