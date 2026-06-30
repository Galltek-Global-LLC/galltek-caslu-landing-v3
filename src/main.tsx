import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// TEMPORÁRIO: WA_URL (+55 21 97353-3963 substituindo +55 11 96350-8768) está
// indisponível — todas as rotas direcionadas pro link do grupo (GRUPO_URL via
// Sparkle). Quando algum número voltar, restaurar / e /wa para WA_URL.
const WA_URL = 'https://wa.me/5521973533963?text=CASLU%2C%20QUERO%20ENTRAR';
const GRUPO_URL = 'https://ap.sparkletracker.com/re/op/6d045aeb-b631-49b6-a48f-2c987ff0e677?uid=1056';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Raiz vai pro grupo (TEMP — voltar pra WA_URL quando o número original normalizar) */}
        <Route path="/" element={<App redirectUrl={GRUPO_URL} />} />
        {/* /wa sempre PV do WhatsApp */}
        <Route path="/wa" element={<App redirectUrl={WA_URL} />} />
        {/* /grupo sempre link Sparkle pro grupo */}
        <Route path="/grupo" element={<App redirectUrl={GRUPO_URL} />} />
        {/* Catch-all cai no grupo */}
        <Route path="*" element={<App redirectUrl={GRUPO_URL} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
