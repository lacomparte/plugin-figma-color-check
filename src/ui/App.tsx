import type { ReactNode } from 'react';
import {
  ActionButtons,
  Header,
  PaletteSelector,
  ResultList,
  Stats,
} from './components';
import { ScanProvider } from './context/ScanContext';
import './styles/global.css';

const AppContent = (): ReactNode => {
  return (
    <div className="app-container">
      <Header />
      <PaletteSelector />
      <ActionButtons />
      <Stats />
      <ResultList />
    </div>
  );
};

export const App = (): ReactNode => {
  return (
    <ScanProvider>
      <AppContent />
    </ScanProvider>
  );
};
