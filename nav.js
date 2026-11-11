(() => {
  // Menu mobile compartilhado por todas as páginas do Resenha do Fut.
  const mobileStyle = document.createElement('style');
  mobileStyle.id = 'resenha-mobile-nav-styles';
  mobileStyle.textContent = `
    .mobile-menu-toggle{display:none}
    @media(max-width:760px){
      .site-header{height:auto!important;min-height:70px;flex-wrap:wrap;gap:0!important;padding:9px 0}
      .mobile-menu-toggle{display:flex;width:42px;height:42px;flex:0 0 42px;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1px solid #344139;border-radius:10px;background:#101713;cursor:pointer}
      .mobile-menu-toggle span{display:block;width:19px;height:2px;border-radius:2px;background:#a8ff3f;transition:transform .18s ease,opacity .18s ease}
      .site-header.menu-open .mobile-menu-toggle span:first-child{transform:translateY(7px) rotate(45deg)}
      .site-header.menu-open .mobile-menu-toggle span:nth-child(2){opacity:0}
      .site-header.menu-open .mobile-menu-toggle span:last-child{transform:translateY(-7px) rotate(-45deg)}
      .site-nav{display:none!important;position:absolute!important;top:calc(100% + 1px);left:0!important;right:0!important;z-index:999;padding:12px!important;background:#101713!important;border:1px solid #344139!important;border-radius:0 0 14px 14px!important;box-shadow:0 18px 35px #000b!important;flex-direction:column!important;align-items:stretch!important;gap:3px!important;font-size:14px!important}
      .site-header.menu-open .site-nav{display:flex!important}
      .site-nav>a{display:block!important;padding:11px 12px!important;border-radius:8px;white-space:normal!important}
      .site-nav>a:hover{background:#1b281c}
      .site-nav .home-cta{display:flex!important;width:100%;justify-content:center;margin-top:7px;padding:13px!important}
      .site-nav .nav-dropdown{width:100%}
      .site-nav .nav-dropdown-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:left;padding:12px!important;border-radius:8px;font-size:14px!important}
      .site-nav .nav-dropdown-toggle:hover{background:#1b281c}
      .site-nav .nav-dropdown-menu{display:none!important;position:static!important;left:auto!important;right:auto!important;min-width:0!important;width:100%;margin:0 0 5px;padding:5px!important;background:#0b110d!important;border:1px solid #29372d!important;border-radius:9px;box-shadow:none!important}
      .site-nav .nav-dropdown.open .nav-dropdown-menu{display:grid!important}
      .site-nav .nav-dropdown-menu a{padding:10px 12px!important}
    }
  `;
  document.head.appendChild(mobileStyle);

  const header = document.querySelector('.site-header');
  const siteNav = header && header.querySelector('.site-nav');
  if (header && siteNav && !header.querySelector('.mobile-menu-toggle')) {
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-toggle';
    menuButton.type = 'button';
    menuButton.setAttribute('aria-label', 'Abrir menu');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-controls', 'site-navigation');
    menuButton.innerHTML = '<span></span><span></span><span></span>';
    siteNav.id = siteNav.id || 'site-navigation';
    header.insertBefore(menuButton, siteNav);
    menuButton.addEventListener('click', () => {
      const open = header.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    siteNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      header.classList.remove('menu-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menu');
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        header.classList.remove('menu-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Abrir menu');
      }
    });
  }

  const accountLink = document.querySelector('[data-account-link]');

  const updateLabel = (session) => {
    if (accountLink) accountLink.textContent = session && session.user ? 'Minha conta' : 'Criar conta';
  };

  const initialize = async () => {
    try {
      if (!window.supabase || !window.supabase.createClient) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const response = await fetch('/api/config/supabase', { cache: 'no-store' });
      if (!response.ok) throw new Error('Configuração Supabase indisponível');
      const config = await response.json();
      if (!config.configured || !window.supabase || !window.supabase.createClient) return;

      const client = window.supabase.createClient(config.url, config.publishableKey);

      // A presença é independente de login e XP. Um ID aleatório persistente no
      // navegador faz várias abas do mesmo visitante contarem como uma pessoa.
      {
        let visitorId = '';
        try {
          visitorId = localStorage.getItem('resenha_presence_id') || '';
          if (!visitorId) {
            visitorId = (window.crypto && crypto.randomUUID)
              ? crypto.randomUUID()
              : 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('resenha_presence_id', visitorId);
          }
        } catch (_) {
          visitorId = (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        }

        const countNode = document.querySelector('[data-resenha-online-count]');
        const statusNode = document.querySelector('[data-resenha-online-status]');
        const channel = client.channel('resenha-site-presence-v1', {
          config: { presence: { key: visitorId } }
        });

        const renderCount = () => {
          const state = channel.presenceState() || {};
          const uniqueVisitors = Object.keys(state).length;
          if (countNode) countNode.textContent = String(uniqueVisitors);
          if (statusNode) statusNode.textContent = uniqueVisitors === 1
            ? '1 torcedor na resenha agora'
            : uniqueVisitors + ' torcedores na resenha agora';
        };

        channel
          .on('presence', { event: 'sync' }, renderCount)
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              try {
                await channel.track({ visitor_id: visitorId, online_at: new Date().toISOString() });
                renderCount();
              } catch (error) {
                console.warn('Não foi possível registrar presença:', error);
                if (countNode) countNode.textContent = '—';
                if (statusNode) statusNode.textContent = 'Atividade ao vivo indisponível';
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              if (countNode) countNode.textContent = '—';
              if (statusNode) statusNode.textContent = 'Reconectando à resenha…';
            }
          });

        window.addEventListener('pagehide', () => {
          try { client.removeChannel(channel); } catch (_) {}
        }, { once: true });
      }

      if (accountLink) {
        const { data: { session } } = await client.auth.getSession();
        updateLabel(session);
        client.auth.onAuthStateChange((_event, nextSession) => updateLabel(nextSession));
      }
    } catch (error) {
      console.warn('Inicialização dos recursos compartilhados:', error);
      const countNode = document.querySelector('[data-resenha-online-count]');
      const statusNode = document.querySelector('[data-resenha-online-status]');
      if (countNode) countNode.textContent = '—';
      if (statusNode) statusNode.textContent = 'Atividade ao vivo indisponível';
    }
  };

  initialize();
})();