import type { GeneratorInput, GeneratedFix } from '../types';

export function generate(_input: GeneratorInput): GeneratedFix {
  const code = `<!-- Age Rating Badge -->
<div id="age-rating-badge" style="
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 999998;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
">18+</div>`;

  return {
    type: 'age-rating',
    title: 'Маркировка возрастного ограничения',
    description:
      'Компактный бейдж с возрастным ограничением «18+» в правом нижнем углу страницы.',
    code,
    targetPath: '/index.html',
    insertionPoint: 'before-close-body',
  };
}
