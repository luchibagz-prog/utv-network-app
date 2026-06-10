import './globals.css';

export const metadata = {
  title: 'UTV - Where The Culture Streams',
  description: 'Independent entertainment, reality shows, podcasts, movies, trailers, and music videos.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
