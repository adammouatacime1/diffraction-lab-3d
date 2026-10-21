import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button, IconButton, LabHeader, LabRoot } from '../../src';
import type { LabTheme } from '../../src';
import { ExampleLaboratory } from './ExampleLaboratory';

/** The future shared website owns navigation and theme; the lab owns its science. */
export default function App() {
  const [theme, setTheme] = useState<LabTheme>('light');
  const [opened, setOpened] = useState(true);
  return <LabRoot theme={theme} className="lk-example-site">
    <LabHeader title="Laboratoires de physique" subtitle="Un design commun, des expériences indépendantes" badge="Kit d’interface" actions={<><Button onClick={() => setOpened(previous => !previous)}>{opened ? 'Fermer le laboratoire' : 'Ouvrir le laboratoire'}</Button><IconButton label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</IconButton></>}/>
    {opened ? <ExampleLaboratory theme={theme}/> : <div className="lk-example-closed"><h1>Choisir un laboratoire</h1><p>Le laboratoire a été démonté. Ses animations et ses ressources ont été libérées.</p><Button primary onClick={() => setOpened(true)}>Ouvrir l’oscillateur</Button></div>}
  </LabRoot>;
}
