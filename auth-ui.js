(async () => {
  const show = (name) => {
    ['loading', 'error', 'authenticated', 'unauthenticated'].forEach((view) => {
      const element = document.getElementById(`view-${view}`);
      if (element) element.hidden = view !== name;
    });
  };
const events = await fetch('/api/proxy/events').then(r => r.json());
const profile = await fetch('/api/proxy/me').then(r => r.json());
  try {
    const response = await fetch('/api/me');
    if (!response.ok) return show('unauthenticated');

    const { user } = await response.json();
    document.getElementById('user-email').textContent = user.email || user.name || 'User';
    show('authenticated');
  } catch {
    show('unauthenticated');
  }
})();
