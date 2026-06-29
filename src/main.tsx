import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const WA_URL = 'https://wa.me/5511963508768?text=CASLU%2C%20QUERO%20ENTRAR';
const GRUPO_URL = 'https://ap.sparkletracker.com/re/op/6d045aeb-b631-49b6-a48f-2c987ff0e677?uid=1056';

// TEMPORÁRIO: número WhatsApp pessoal (WA_URL) caiu — todas as rotas
// estão direcionadas pro link do grupo (GRUPO_URL via Sparkle).
// Quando o número voltar, restaurar / e /wa para WA_URL.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App redirectUrl={GRUPO_URL} />} />
        <Route path="/wa" element={<App redirectUrl={GRUPO_URL} />} />
        <Route path="/grupo" element={<App redirectUrl={GRUPO_URL} />} />
        <Route path="*" element={<App redirectUrl={GRUPO_URL} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
