import type { Metadata } from 'next';
import './globals.css';
import './vibecad.css';
import './experience.css';
import './vibecad-flare.css';
import './vibecad-character.css';
import './vibecad-navigation.css';
import './vibecad-circuits.css';
import localFont from 'next/font/local';
const vibecadFont=localFont({src:'../public/fonts/Oxanium-Variable.ttf',variable:'--font-vibecad',display:'swap',weight:'200 800'});
export const metadata: Metadata = { icons: { icon: '/favicon.svg' }, title: 'VibeCAD — Understand. Modify. Verify.', description: 'Have a conversation with any physical object. Explore its parts, understand its mechanisms, and see your changes take shape with the model.' };
export default function Layout({ children }: { children: React.ReactNode }) {return <html lang="en" className={vibecadFont.variable}><body>{children}</body></html>}
