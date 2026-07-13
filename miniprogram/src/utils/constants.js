export const PLACEHOLDER_GRADIENTS = [
  { from: '#1c2333', to: '#2a3448' },
  { from: '#1f1f2e', to: '#2d2d42' },
  { from: '#1a2820', to: '#263d2e' },
  { from: '#231a1a', to: '#3a2828' },
  { from: '#1a1e2e', to: '#252a42' },
  { from: '#221a2e', to: '#342640' },
  { from: '#1e2a1e', to: '#2c3e2c' },
  { from: '#2a2218', to: '#3e3222' },
]

export const getPlaceholderGrad = (index) => {
  const g = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length]
  return `linear-gradient(145deg, ${g.from} 0%, ${g.to} 100%)`
}

// kept for compat
export const getPlaceholderColor = (index) => {
  return PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length].from
}

export const QUICK_NAV = [
  { label: '淋浴', abbr: 'S' },
  { label: '马桶', abbr: 'T' },
  { label: '浴缸', abbr: 'B' },
  { label: '五金', abbr: 'H' },
]
