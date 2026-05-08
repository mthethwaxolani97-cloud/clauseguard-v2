// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ClauseGuard — AI T&C Intelligence',
    description: 'Scan. Monitor. Alert. Protect. AI-powered Terms & Conditions analysis for prop firm traders.',
    };

    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
          <html lang="en">
                <body>
                        <NavBar />
                                {children}
                                      </body>
                                          </html>
                                            );
                                            }

                                            function NavBar() {
                                              return (
                                                  <nav>
                                                        <Link href="/" className="logo">
                                                                <div className="logo-shield" />
                                                                        ClauseGuard
                                                                              </Link>
                                                                                    <div className="nav-links">
                                                                                            <Link href="/propwatch" className="nav-link">PropWatch</Link>
                                                                                                    <Link href="/monitor" className="nav-link">⚙ Account Monitor</Link>
                                                                                                            <Link href="/" className="nav-link">How It Works</Link>
                                                                                                                  </div>
                                                                                                                        <div className="nav-right">
                                                                                                                                <Link href="/dashboard" className="btn btn-ghost">My Dashboard</Link>
                                                                                                                                        <Link href="/login" className="btn btn-primary">Sign In</Link>
                                                                                                                                              </div>
                                                                                                                                                  </nav>
                                                                                                                                                    );
                                                                                                                                                    }
