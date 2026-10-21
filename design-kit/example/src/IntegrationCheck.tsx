import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, LabRoot, ParameterControl, Tabs } from '../../src';
import { ExampleLaboratory } from './ExampleLaboratory';

/** Separate integration fixture: the example's general navigation stays in App.tsx. */
function IntegrationCheck() {
  const [active, setActive] = useState(true);
  const [value, setValue] = useState(1);
  const [mode, setMode] = useState('first');
  return <>
    <LabRoot theme="dark" data-testid="outer-dark">
      <Button onClick={() => setActive(previous => !previous)}>{active ? 'Désactiver sans démonter' : 'Réactiver le laboratoire'}</Button>
      <LabRoot theme="light" data-testid="inner-light">
        <Tabs id="isolation" label="Onglets isolés" options={[{ id: 'first', label: 'Premier' }, { id: 'second', label: 'Second' }]} value={mode} onChange={setMode}/>
        <div role="tabpanel" id="isolation-panel" aria-labelledby={`isolation-${mode}`}>
          <ParameterControl label="Valeur isolée" value={value} min={0} max={5} step={0.1} onChange={setValue}/>
          <div className="lk-warning">Avertissement clair dans une racine sombre</div>
        </div>
      </LabRoot>
    </LabRoot>
    <ExampleLaboratory active={active} theme="dark"/>
  </>;
}

createRoot(document.getElementById('root')!).render(<IntegrationCheck/>);
