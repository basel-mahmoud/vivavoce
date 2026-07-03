/** Central site config used across metadata, nav, footer, and JSON-LD. */
export const site = {
  name: 'VivaVoce',
  tagline: 'Say it out loud before it counts.',
  description:
    'VivaVoce is a voice-first study sparring app. It asks real exam questions, listens to your spoken answer, and marks it on correctness, clarity, structure, conciseness, and confidence, so you can rehearse vivas, interviews, and presentations until they feel familiar.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  email: 'hello@vivavoce.app',
  nav: [
    { label: 'Features', href: '/features' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Use cases', href: '/use-cases' },
    { label: 'FAQ', href: '/faq' },
  ],
  footer: {
    Product: [
      { label: 'Features', href: '/features' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Use cases', href: '/use-cases' },
      { label: 'Early access', href: '/waitlist' },
    ],
    Company: [
      { label: 'Contact', href: '/contact' },
      { label: 'Accessibility', href: '/legal/accessibility' },
    ],
    Legal: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
} as const;
