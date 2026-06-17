import './globals.css';

export const metadata = {
  title: 'UTV - Where The Culture Streams',
  description:
    'Independent entertainment, reality shows, podcasts, movies, music videos, documentaries and live events.',
  manifest: '/manifest.json',
  themeColor: '#7c3aed'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
