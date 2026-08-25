export const SITE = {
  name: 'Peoples Theatre Laboratory',
  shortName: 'PTL',
  city: 'Vadodara',
  region: 'Gujarat, India',
  url: 'https://peoplestheatrelaboratory.com',
  description:
    'Peoples Theatre Laboratory, Vadodara. Home of Baithak and Kabir Sang Ruhdaari.',
  locale: 'en_IN',
  phone: '+91 98240 10483',
  phoneHref: 'tel:+919824010483',
} as const;

export const NAV = [
  { label: 'Events', deva: 'बैठक', href: '/events', note: 'when we gather' },
  { label: 'Library', deva: 'गीत', href: '/library', note: 'songs, poetry, scripts' },
  { label: 'About', deva: 'प्रयोगशाला', href: '/about', note: 'why we exist' },
  { label: 'Contact', deva: 'संपर्क', href: '#contact', note: 'ways to join in' },
] as const;

export const SOCIALS = [
  {
    label: 'Instagram',
    handle: '@peoplestheatrelaboratory',
    href: 'https://www.instagram.com/peoplestheatrelaboratory/',
  },
  {
    label: 'Instagram — KSR',
    handle: '@kabirsangruhdaari.ptl',
    href: 'https://www.instagram.com/kabirsangruhdaari.ptl/',
  },
  {
    label: 'Facebook',
    handle: '/ptlvadodara',
    href: 'https://www.facebook.com/ptlvadodara/',
  },
] as const;
