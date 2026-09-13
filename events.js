const form = document.getElementById('search');
const status = document.getElementById('status');
const results = document.getElementById('results');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = 'Loading live events…';
  results.replaceChildren();
  const zip = document.getElementById('zip').value;
  const radius = document.getElementById('radius').value;
  const params = new URLSearchParams({ zip, radius });

  try {
    const response = await fetch(`/api/events?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const scope = data.radius === 'nationwide' ? 'nationwide' : `within ${data.radius} miles of ${data.zip}`;
    status.textContent = data.events.length ? `${data.events.length} events found ${scope}` : 'No events found in this area.';

    data.events.forEach((eventItem) => {
      const card = document.createElement('article');
      card.className = 'event';
      if (eventItem.image) {
        const image = document.createElement('img');
        image.src = eventItem.image;
        image.alt = '';
        card.append(image);
      }
      const info = document.createElement('div');
      const title = document.createElement('h2');
      const link = document.createElement('a');
      link.href = eventItem.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = eventItem.name;
      title.append(link);
      info.append(title);
      const details = [
        ['When', `${eventItem.date}${eventItem.time ? ` · ${eventItem.time}` : ''}`],
        ['Where', [eventItem.venue, eventItem.city, eventItem.state].filter(Boolean).join(', ')],
        ['Distance', eventItem.distance ? `${eventItem.distance} miles away` : data.radius === 'nationwide' ? 'Nationwide result' : 'Near your selected ZIP'],
      ];
      details.forEach(([label, value]) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = `${label}: ${value}`;
        info.append(paragraph);
      });
      card.append(info);
      results.append(card);
    });
  } catch (error) {
    status.textContent = error.message;
  }
});
