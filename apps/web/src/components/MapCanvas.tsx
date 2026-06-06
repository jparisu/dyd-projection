import { useEffect, useRef } from 'react';
import type { GameElement, GameMap, Item, Point } from '@dnd/shared';
import { MapScene } from '../pixi/MapScene.js';

interface Props {
  map: GameMap;
  elements: GameElement[];
  items: Item[];
  selectedId: string | null;
  interactive: boolean;
  autoFit: boolean;
  playerVisibleOnly: boolean;
  showObstacles: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, position: Point) => void;
}

export function MapCanvas(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MapScene | null>(null);

  // Create the scene once per mount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new MapScene();
    sceneRef.current = scene;
    void scene.init(host);
    return () => {
      sceneRef.current = null;
      scene.destroy();
    };
  }, []);

  // Push prop updates into the scene on every render with fresh data.
  useEffect(() => {
    sceneRef.current?.update(props);
  });

  return <div ref={hostRef} className="h-full w-full" />;
}
