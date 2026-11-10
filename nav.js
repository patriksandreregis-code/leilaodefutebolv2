(() => {
  const accountLink = document.querySelector('[data-account-link]');
  if (!accountLink) return;

  const updateLabel = (session) => {
    accountLink.textContent = session && session.user ? 'Minha conta' : 'Criar conta';
  };

  const initialize = async () => {
    try {
      if (!window.supabase) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const response = await fetch('/api/config/supabase', { cache: 'no-store' });
      if (!response.ok) return;
      const config = await response.json();
      if (!config.configured || !window.supabase) return;

      const client = window.supabase.createClient(config.url, config.publishableKey);
      const { data: { session } } = await client.auth.getSession();
      updateLabel(session);
      client.auth.onAuthStateChange((_event, nextSession) => updateLabel(nextSession));
    } catch (error) {
      console.warn('Não foi possível atualizar o botão da conta:', error);
    }
  };

  initialize();
})();
