const HEX = /^#[0-9a-fA-F]{6}$/;

export function getChatTheme(value) {
  const colors = typeof value === 'string' ? value.split(',') : [];
  const valid = colors.length >= 1 && colors.length <= 2 && colors.every((part) => HEX.test(part));
  const stops = valid ? colors : ['#0284c7'];
  return {
    accent: stops[0],
    background: stops.length === 2 ? `linear-gradient(135deg, ${stops[0]}, ${stops[1]})` : stops[0],
    text: stops.length === 2 ? '#26324a' : '#ffffff',
  };
}
